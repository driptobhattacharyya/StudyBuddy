import { useCallback, useEffect, useRef, useState } from 'react'
import { wsUrl } from './api'

export const STREAM_END = '[[END]]'
export const STREAM_ERROR = '[[ERROR]]'
export const STREAM_META = '[[META]]'

/**
 * useAIStream(path) - client for the backend's streaming WebSocket protocol.
 *
 * Protocol (see CONTRACT.md): connect to `path?token=<jwt>`, send ONE JSON message
 * (e.g. { query, course_id, week }), receive text chunks, then the literal "[[END]]"
 * and the server closes. On failure the server may send "[[ERROR]] <message>".
 * Before "[[END]]" the server sends one "[[META]] {json}" frame with
 * { trace_id, citations: [{title, week}], model, latency_ms, tokens_in, tokens_out } -> exposed as `meta`
 * (and as `meta` in the send() result). Pass meta.trace_id to <UnderTheHood traceId=... />.
 * A close code of 4401 means the token was rejected.
 *
 * const { text, status, error, meta, send, stop, reset, isStreaming } = useAIStream('/search_generate')
 * const result = await send({ query, course_id, week })   // -> { text, status, error, meta }
 *
 * status: 'idle' | 'streaming' | 'done' | 'stopped' | 'error'
 * The socket is closed automatically on unmount, when send() is called again, or via stop().
 */
export function useAIStream(path) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)
  const wsRef = useRef(null)
  const settleRef = useRef(null)

  const closeSocket = useCallback(() => {
    const ws = wsRef.current
    wsRef.current = null
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close()
    }
  }, [])

  const stop = useCallback(() => {
    if (settleRef.current) settleRef.current('stopped', null)
  }, [])

  const reset = useCallback(() => {
    if (settleRef.current) settleRef.current('idle', null)
    setText('')
    setError(null)
    setMeta(null)
    setStatus('idle')
  }, [])

  const send = useCallback(
    (payload, { onChunk } = {}) =>
      new Promise((resolve) => {
        // Abort anything still in flight.
        if (settleRef.current) settleRef.current('stopped', null)

        let acc = ''
        let metaData = null
        let settled = false
        setText('')
        setError(null)
        setMeta(null)
        setStatus('streaming')

        const settle = (finalStatus, err) => {
          if (settled) return
          settled = true
          settleRef.current = null
          closeSocket()
          setStatus(finalStatus)
          setError(err)
          resolve({ text: acc, status: finalStatus, error: err, meta: metaData })
        }
        settleRef.current = settle

        let ws
        try {
          ws = new WebSocket(wsUrl(path))
        } catch {
          settle('error', 'Could not open a connection to the AI service.')
          return
        }
        wsRef.current = ws

        ws.onopen = () => ws.send(JSON.stringify(payload))
        ws.onmessage = (event) => {
          const data = typeof event.data === 'string' ? event.data : ''
          if (data === STREAM_END) return settle('done', null)
          if (data.startsWith(STREAM_META)) {
            try {
              metaData = JSON.parse(data.slice(STREAM_META.length).trim())
              setMeta(metaData)
            } catch {
              /* ignore malformed meta */
            }
            return
          }
          if (data.startsWith(STREAM_ERROR)) {
            return settle('error', data.slice(STREAM_ERROR.length).trim() || 'The AI service reported an error.')
          }
          acc += data
          setText(acc)
          onChunk?.(data, acc)
        }
        ws.onerror = () => settle('error', 'Connection to the AI service failed.')
        ws.onclose = (event) => {
          if (event.code === 4401) return settle('error', 'Your session has expired. Please sign in again.')
          // Closed without [[END]]: treat what we have as the answer.
          settle(acc ? 'done' : 'error', acc ? null : 'The AI service closed the connection without a response.')
        }
      }),
    [path, closeSocket],
  )

  useEffect(
    () => () => {
      if (settleRef.current) settleRef.current('stopped', null)
      closeSocket()
    },
    [closeSocket],
  )

  return { text, status, error, meta, send, stop, reset, isStreaming: status === 'streaming' }
}
