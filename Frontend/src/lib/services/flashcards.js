import { api } from '../api'

/** Flashcard shape: { _id, user_id, course_id, week, title, content } */

/** GET /user/flashcards -> all of the current user's flashcards (newest first) */
export const getMyFlashcards = () => api.get('/user/flashcards').then((r) => r.data)

/** GET /user/get/course/{course_id} -> the user's flashcards for a course */
export const getFlashcardsByCourse = (courseId) => api.get(`/user/get/course/${courseId}`).then((r) => r.data)

/** GET /user/get/course/{course_id}/week/{week_id} */
export const getFlashcardsByCourseWeek = (courseId, week) => api.get(`/user/get/course/${courseId}/week/${week}`).then((r) => r.data)

/** GET /flash_card/get/{flash_card_id} */
export const getFlashcard = (id) => api.get(`/flash_card/get/${id}`).then((r) => r.data)

/** POST /flash_card/create { course_id, week, title, content } */
export const createFlashcard = (card) => api.post('/flash_card/create', card).then((r) => r.data)

/** PUT /flash_card/update/{id} { week, title, content } */
export const updateFlashcard = (id, card) => api.put(`/flash_card/update/${id}`, card).then((r) => r.data)

/** DELETE /flash_card/delete/{id} */
export const deleteFlashcard = (id) => api.delete(`/flash_card/delete/${id}`).then((r) => r.data)

/**
 * POST /flash_card/generate { course_id, week, title (the topic), content: '' }
 * AI-generates the card from course material, saves it and returns the new Flashcard.
 */
export const generateFlashcard = ({ courseId, week, topic }) =>
  api.post('/flash_card/generate', { course_id: courseId, week, title: topic, content: '' }).then((r) => r.data)
