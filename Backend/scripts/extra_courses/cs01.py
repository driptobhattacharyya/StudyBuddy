"""CS01 - Python Data Structures and Algorithms.

Lectures come from MIT 6.006 Introduction to Algorithms (MIT OpenCourseWare, CC BY-NC-SA).
"""
from scripts.extra_courses.helpers import lecture, mcq, msq, num, code, note

OCW_F11 = {"label": "MIT OCW 6.006 (Fall 2011) course page", "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/"}
OCW_S20 = {"label": "MIT OCW 6.006 (Spring 2020) course page", "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/"}

COURSE = {
    "course_id": "CS01",
    "course_name": "Python Data Structures and Algorithms",
    "description": "How to think about running time, and the handful of structures (heaps, trees, hash tables, graphs) that solve most real problems. Every week pairs an MIT lecture with Python practice.",
    "instructor": "Course team, with lectures from MIT 6.006",
    "level": "Intermediate",
    "total_weeks": 6,
    "color": "#b45309",
}

WEEK_TITLES = {
    1: "Thinking about algorithms",
    2: "Sorting and heaps",
    3: "Search trees",
    4: "Linear-time sorting and hashing",
    5: "Graph search",
    6: "Shortest paths and dynamic programming",
}

LECTURES = [
    lecture(1, 1, "Algorithmic thinking and peak finding", "HtSuA80QTyo", "MIT OpenCourseWare",
            "The course opens with a deceptively small problem: find a peak in an array. Going from a linear scan to a divide-and-conquer solution shows why we bother analysing algorithms at all.",
            """- A *peak* is an element no smaller than its neighbours; one always exists.
- Linear scan is Θ(n). Looking at the middle and moving towards a bigger neighbour gives Θ(log n).
- The 2-D version shows that a natural-looking greedy idea can be wrong; argue correctness before you optimise.
- Asymptotic notation (O, Θ, Ω) lets us compare algorithms without worrying about the machine.""", [OCW_F11]),
    lecture(1, 2, "Models of computation and document distance", "Zc54gFhdpLA", "MIT OpenCourseWare",
            "What does a single 'step' cost? This lecture pins down the RAM and pointer-machine models and uses a document-similarity program to show how innocent Python operations hide real costs.",
            """- Word-RAM model: constant-time arithmetic and memory access on word-sized values.
- Python list `append` is amortised O(1), but `L1 + L2` copies and costs O(len(L1) + len(L2)).
- Document distance = angle between word-frequency vectors.
- Profiling the naive version shows the bottleneck is usually one careless line, not the overall idea.""", [OCW_F11]),
    lecture(2, 1, "Insertion sort and merge sort", "Kg4bqzAqRBM", "MIT OpenCourseWare",
            "Two classic sorts side by side. Insertion sort is simple and quadratic; merge sort uses divide and conquer to reach n log n, and the recursion tree explains why.",
            """- Insertion sort: Θ(n²) comparisons in the worst case, but in-place and fast for nearly sorted input.
- Merge sort: T(n) = 2T(n/2) + Θ(n) = Θ(n log n). Needs Θ(n) extra space.
- Draw the recursion tree: log n levels, Θ(n) work per level.
- Binary insertion sort cuts comparisons, not swaps, so it is still Θ(n²).""", [OCW_F11]),
    lecture(2, 2, "Heaps and heap sort", "B7hVxCmfPtM", "MIT OpenCourseWare",
            "A heap is an array that behaves like a tree. You'll see how max-heapify works, why build-heap is linear, and how that turns into an in-place n log n sort.",
            """- Array index i has children 2i+1 and 2i+2 (0-based); parent (i-1)//2.
- `max_heapify` fixes one violation in O(log n).
- `build_max_heap` is O(n), not O(n log n): most nodes are near the leaves.
- Heap sort: build once, then repeatedly swap the root to the end and heapify. In Python, use `heapq` (a min-heap).""", [OCW_F11]),
    lecture(3, 1, "Binary search trees and BST sort", "9Jry5-82I68", "MIT OpenCourseWare",
            "Using a runway-reservation problem as motivation, this lecture introduces binary search trees: insert, find, and in-order traversal, all in time proportional to the tree's height.",
            """- BST invariant: left subtree keys ≤ node key ≤ right subtree keys.
- Insert / find / min / max take O(h) where h is the height.
- In-order traversal visits keys in sorted order, so BST sort = n inserts + traversal.
- Without balancing, h can be n (insert sorted data and see).""", [OCW_F11]),
    lecture(3, 2, "AVL trees and AVL sort", "FNeL18KsWPc", "MIT OpenCourseWare",
            "Keeping a BST balanced with rotations. AVL trees guarantee O(log n) height, which makes every operation logarithmic.",
            """- AVL property: heights of left and right children differ by at most 1.
- That forces h ≤ ~1.44 log₂ n.
- After an insert, walk up and fix imbalances with single or double rotations.
- Rotations are O(1) pointer changes that preserve in-order order.""", [OCW_F11]),
    lecture(4, 1, "Counting sort, radix sort, and lower bounds", "Nz1KZXbghj8", "MIT OpenCourseWare",
            "Why can't comparison sorting beat n log n? The decision-tree argument says it can't, and counting and radix sort get around the limit by not comparing at all.",
            """- Any comparison sort needs Ω(n log n) comparisons: a decision tree must have n! leaves.
- Counting sort: O(n + k) for integer keys in [0, k). Stable.
- Radix sort: sort by digit using a stable sort, least significant digit first; O(d·(n + b)).
- Searching in a sorted list also has an Ω(log n) comparison lower bound.""", [OCW_F11]),
    lecture(5, 1, "Breadth-first search", "s-CYnVz-uh4", "MIT OpenCourseWare",
            "Graphs show up everywhere, from puzzles to social networks. BFS explores a graph level by level and finds shortest paths when every edge costs the same.",
            """- Represent graphs with adjacency lists: `dict[node] -> list[neighbours]`.
- BFS uses a queue (`collections.deque`) and a `level`/`parent` map.
- Runs in O(V + E).
- Following `parent` pointers back from a node gives a shortest path (fewest edges).""", [OCW_F11]),
    lecture(5, 2, "Depth-first search and topological sort", "AfSk24UTFS8", "MIT OpenCourseWare",
            "DFS goes as deep as possible before backtracking. Its finishing order gives a topological sort of a DAG, and back edges tell you when there's a cycle.",
            """- DFS also runs in O(V + E); recursion or an explicit stack.
- Edge types: tree, back, forward, cross. A back edge means a cycle.
- Topological order = reverse of DFS finishing order (DAGs only).
- Typical uses: build systems, course prerequisites, detecting deadlocks.""", [OCW_F11]),
    lecture(6, 1, "Dijkstra's algorithm", "2E7MmKv0Y24", "MIT OpenCourseWare",
            "Shortest paths with non-negative edge weights. Dijkstra greedily settles the closest unsettled vertex and relies on a priority queue to stay fast.",
            """- Relaxation: if d[u] + w(u, v) < d[v], update d[v].
- Always extract the vertex with the smallest tentative distance.
- With a binary heap: O((V + E) log V).
- Breaks with negative edges; use Bellman-Ford there.""", [OCW_F11]),
    lecture(6, 2, "Dynamic programming, part 1", "D2fBXqUUHPM", "MIT OpenCourseWare (Spring 2020)",
            "Dynamic programming as 'careful brute force'. The SRTBOT recipe (subproblems, relations, topological order, base cases, original problem, time) is applied to Fibonacci, DAG shortest paths, and bowling.",
            """- Memoise: solve each subproblem once, store the answer.
- SRTBOT: Subproblems, Relate, Topological order, Base case, Original problem, Time.
- Running time ≈ (number of subproblems) × (work per subproblem).
- In Python, `functools.lru_cache` gives you memoisation in one line.""", [OCW_S20]),
    lecture(6, 3, "Dynamic programming, part 2: LCS, LIS, coins", "KLBCUx1is2c", "MIT OpenCourseWare (Spring 2020)",
            "More practice with SRTBOT on sequence problems: longest common subsequence, longest increasing subsequence, and a coin-picking game.",
            """- Subproblems over sequences are usually prefixes, suffixes, or substrings.
- LCS on strings of length n and m: O(nm) subproblems, O(1) each.
- LIS: O(n²) with the straightforward DP; O(n log n) with patience sorting.
- Two-player games: the subproblem includes whose turn it is.""", [OCW_S20]),
]

# Lectures whose YouTube ids have not been confirmed yet. The seed skips them
# unless run with --include-unverified.
PENDING_LECTURES = [
    lecture(1, 3, "Big-O notation in practice", "v4cd1O4zkGw", "HackerRank",
            "A short, practical walk through Big-O notation with code examples.",
            "- Drop constants and lower-order terms.\n- Different inputs get different variables (O(a + b), not O(n)).", []),
    lecture(4, 2, "Hashing with chaining", "0M_kIqhwbFo", "MIT OpenCourseWare",
            "Dictionaries in O(1) expected time: hash functions, collisions, chaining, and simple uniform hashing.",
            "- Load factor α = n/m; expected chain length is α.\n- Python `dict` and `set` are hash tables.", [OCW_F11]),
    lecture(6, 4, "Single-source shortest paths", "Aa2sqUhIn-E", "MIT OpenCourseWare",
            "Weighted graphs, relaxation, and why negative cycles make shortest paths undefined.",
            "- δ(s, v) is undefined if a negative cycle is reachable.\n- Relaxation is the common core of Dijkstra and Bellman-Ford.", [OCW_F11]),
]

NOTES = [
    note(1, "Week 1 reading: measuring algorithms", """
<h3>Why count steps instead of seconds?</h3>
<p>The same program runs at different speeds on different machines, so we measure how the number of basic steps grows as the input grows. If doubling the input doubles the work, the algorithm is linear. If it quadruples the work, it is quadratic.</p>
<h3>The notation, briefly</h3>
<ul>
<li><b>O(f(n))</b>: grows no faster than f(n), an upper bound.</li>
<li><b>Ω(f(n))</b>: grows at least as fast as f(n), a lower bound.</li>
<li><b>Θ(f(n))</b>: both, so a tight bound.</li>
</ul>
<h3>Hidden costs in Python</h3>
<table>
<tr><th>Operation</th><th>Cost</th></tr>
<tr><td><code>lst.append(x)</code></td><td>O(1) amortised</td></tr>
<tr><td><code>lst.insert(0, x)</code></td><td>O(n)</td></tr>
<tr><td><code>x in lst</code></td><td>O(n)</td></tr>
<tr><td><code>x in some_set</code></td><td>O(1) expected</td></tr>
<tr><td><code>lst[a:b]</code></td><td>O(b − a)</td></tr>
<tr><td><code>sorted(lst)</code></td><td>O(n log n)</td></tr>
</table>
<p>Most slow student code comes from a hidden O(n) operation inside a loop, often <code>in</code> on a list or <code>insert(0, …)</code>.</p>
"""),
    note(2, "Week 2 reading: divide and conquer", """
<h3>The pattern</h3>
<p>Split the problem into smaller copies of itself, solve those recursively, then combine. Merge sort splits in half and merges in linear time, which gives <code>T(n) = 2T(n/2) + n</code>.</p>
<h3>Solving recurrences with a tree</h3>
<p>Draw the recursion tree. Merge sort has log₂ n levels, and every level does about n work in total, so it is n log n overall. This drawing is often quicker and more reliable than memorising the master theorem.</p>
<h3>Heaps in Python</h3>
<pre>import heapq
h = []
heapq.heappush(h, 5)
heapq.heappush(h, 1)
heapq.heappop(h)   # 1, the smallest</pre>
<p><code>heapq</code> is a min-heap. For a max-heap, push negated keys.</p>
"""),
    note(3, "Week 3 reading: when trees go wrong", """
<h3>Height is everything</h3>
<p>Every BST operation walks one root-to-leaf path, so its cost is the tree's height. Insert 1, 2, 3, …, n into a plain BST and you get a linked list of height n.</p>
<h3>Balancing</h3>
<p>AVL trees keep sibling heights within one of each other, and red-black trees use colour rules. Both guarantee O(log n) height. You won't usually write one by hand: in Python, <code>bisect</code> on a sorted list or the <code>sortedcontainers</code> package covers most needs.</p>
<h3>Things to try</h3>
<ul><li>Insert the keys 50, 30, 70, 20, 40, 60, 80 into a BST on paper and write down the in-order traversal.</li>
<li>Now insert 10, 20, 30 into an empty AVL tree and perform the rotation.</li></ul>
"""),
    note(4, "Week 4 reading: beating n log n, and hashing", """
<h3>The lower bound only applies to comparisons</h3>
<p>Counting sort never compares two keys. It counts how many times each key occurs and writes them back in order. That is why it can run in O(n + k).</p>
<h3>Hash tables</h3>
<p>A hash function maps a key to a bucket index. Collisions are unavoidable (the pigeonhole principle), and chaining stores a small list per bucket. Keep the load factor bounded by resizing, and the expected cost per operation stays O(1).</p>
<p>Python's <code>dict</code> uses open addressing instead of chaining, but the idea is the same.</p>
"""),
    note(5, "Week 5 reading: modelling problems as graphs", """
<h3>Spotting the graph</h3>
<p>A surprising number of problems turn into graph search once you decide what the nodes and edges are. In a Rubik's cube, nodes are configurations and edges are twists. In course planning, nodes are courses and edges are prerequisites.</p>
<h3>BFS or DFS?</h3>
<ul><li>Need fewest steps? Use <b>BFS</b>.</li>
<li>Need an ordering, cycle detection, or connected components? Use <b>DFS</b>.</li></ul>
<pre>from collections import deque
def bfs(adj, s):
    dist = {s: 0}
    q = deque([s])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist</pre>
"""),
    note(6, "Week 6 reading: weighted paths and DP", """
<h3>Dijkstra in about ten lines</h3>
<pre>import heapq
def dijkstra(adj, s):
    dist = {s: 0}
    pq = [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if d + w < dist.get(v, float('inf')):
                dist[v] = d + w
                heapq.heappush(pq, (d + w, v))
    return dist</pre>
<h3>Recognising a DP problem</h3>
<p>Ask two questions. Can the answer be built from answers to smaller versions of the same problem? Do those smaller versions repeat? If both answers are yes, write the recursion first, then memoise it.</p>
"""),
]

QUESTIONS = {
    1: {
        "AQ": [
            mcq("Which growth rate is the slowest as n becomes large?", ["n", "log n", "n log n", "√n"], "log n"),
            mcq("A peak in a 1-D array is an element that is…", ["strictly larger than all others", "no smaller than its neighbours", "the first element", "the median"], "no smaller than its neighbours"),
        ],
        "PA": [
            mcq("The divide-and-conquer 1-D peak finder runs in:", ["Θ(1)", "Θ(log n)", "Θ(n)", "Θ(n log n)"], "Θ(log n)"),
            msq("Which of these Python operations are O(n) on a list of length n?", ["x in lst", "lst.append(x)", "lst.insert(0, x)", "lst[-1]"], ["x in lst", "lst.insert(0, x)"]),
            num("An algorithm takes n² steps. If n goes from 1,000 to 3,000, by what factor does the work grow?", "9"),
        ],
        "GA": [
            mcq("Which statement is true?", ["3n² + 100n = O(n)", "n log n = O(n²)", "2ⁿ = O(n¹⁰⁰)", "n = Ω(n²)"], "n log n = O(n²)"),
            msq("Which of these functions are Θ(n²)?", ["5n² + 3n", "n²/1000", "n log n", "(n + 1)²"], ["5n² + 3n", "n²/1000", "(n + 1)²"]),
            num("How many times does the loop body run?  for i in range(10): for j in range(i): body()", "45"),
            mcq("Concatenating two Python lists of lengths a and b with + costs:", ["O(1)", "O(a)", "O(a + b)", "O(ab)"], "O(a + b)"),
            num("Binary search on a sorted list of 1,024 elements needs at most how many halvings to reach a single element?", "10"),
        ],
    },
    2: {
        "AQ": [
            mcq("Merge sort's recurrence is:", ["T(n) = T(n−1) + n", "T(n) = 2T(n/2) + n", "T(n) = T(n/2) + 1", "T(n) = 2T(n−1)"], "T(n) = 2T(n/2) + n"),
            mcq("In a 0-indexed array heap, the left child of index i is at:", ["i + 1", "2i", "2i + 1", "i // 2"], "2i + 1"),
        ],
        "PA": [
            mcq("Insertion sort on an already-sorted array of n elements takes:", ["Θ(1)", "Θ(n)", "Θ(n log n)", "Θ(n²)"], "Θ(n)"),
            msq("Which sorts are stable in their standard form?", ["Merge sort", "Insertion sort", "Heap sort", "Python's sorted()"], ["Merge sort", "Insertion sort", "Python's sorted()"]),
            num("How many levels does merge sort's recursion tree have for n = 64 (count the root level as 1)?", "7"),
        ],
        "GA": [
            mcq("Building a heap from an unsorted array with repeated max_heapify (bottom-up) costs:", ["O(log n)", "O(n)", "O(n log n)", "O(n²)"], "O(n)"),
            mcq("Python's heapq module implements a:", ["max-heap", "min-heap", "balanced BST", "Fibonacci heap"], "min-heap"),
            msq("Which are true about heap sort?", ["It runs in O(n log n) worst case", "It can be done in place", "It is stable", "It needs Θ(n) extra memory"], ["It runs in O(n log n) worst case", "It can be done in place"]),
            num("What is the maximum number of comparisons insertion sort makes on 5 elements?", "10"),
            mcq("Merging two sorted lists of lengths a and b takes:", ["O(a·b)", "O(a + b)", "O(log(a + b))", "O(max(a, b)²)"], "O(a + b)"),
        ],
    },
    3: {
        "AQ": [
            mcq("An in-order traversal of a BST outputs keys in:", ["insertion order", "sorted order", "reverse insertion order", "level order"], "sorted order"),
            mcq("BST find, insert and delete all run in time proportional to the tree's:", ["number of leaves", "height", "width", "number of keys"], "height"),
        ],
        "PA": [
            num("Insert 1, 2, 3, 4, 5 in that order into an empty plain BST. What is its height, counting edges on the longest root-to-leaf path?", "4"),
            mcq("The AVL property requires sibling subtree heights to differ by at most:", ["0", "1", "2", "log n"], "1"),
            msq("Which operations preserve the BST in-order sequence?", ["Left rotation", "Right rotation", "Swapping two siblings", "Double rotation"], ["Left rotation", "Right rotation", "Double rotation"]),
        ],
        "GA": [
            mcq("Inserting 10, 20, 30 into an empty AVL tree triggers a:", ["single right rotation", "single left rotation", "left-right double rotation", "no rotation"], "single left rotation"),
            mcq("Worst-case time to find the minimum in an AVL tree with n nodes:", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "O(log n)"),
            num("A perfect binary tree of height 3 (edges) has how many nodes?", "15"),
            msq("Which are good reasons to prefer a balanced BST over a hash table?", ["You need keys in sorted order", "You need 'next larger key' queries", "You only need exact-match lookups", "You need range queries"], ["You need keys in sorted order", "You need 'next larger key' queries", "You need range queries"]),
            mcq("The successor of a node with a right child is:", ["its parent", "the minimum of its right subtree", "the maximum of its left subtree", "the root"], "the minimum of its right subtree"),
        ],
    },
    4: {
        "AQ": [
            mcq("Comparison-based sorting needs, in the worst case, at least:", ["Ω(n)", "Ω(n log n)", "Ω(n²)", "Ω(log n)"], "Ω(n log n)"),
            mcq("Counting sort runs in O(n + k) where k is:", ["the number of digits", "the range of key values", "the number of buckets in a hash table", "log n"], "the range of key values"),
        ],
        "PA": [
            mcq("Radix sort processes digits starting from the:", ["most significant", "least significant", "middle", "largest"], "least significant"),
            msq("Which are true about hash tables with chaining?", ["Expected lookup is O(1 + α)", "Worst-case lookup is O(1)", "α is the load factor n/m", "Collisions can be avoided with a good hash"], ["Expected lookup is O(1 + α)", "α is the load factor n/m"]),
            num("A hash table has 200 slots and holds 50 keys. What is the load factor, as a decimal?", "0.25"),
        ],
        "GA": [
            mcq("Why must the per-digit sort in radix sort be stable?", ["To save memory", "To preserve the ordering from earlier digits", "To handle negative numbers", "To run in place"], "To preserve the ordering from earlier digits"),
            num("A decision tree for sorting 3 distinct elements needs at least how many leaves?", "6"),
            msq("Which Python types are implemented with hash tables?", ["dict", "set", "list", "frozenset"], ["dict", "set", "frozenset"]),
            mcq("Doubling the table size whenever it fills makes insertions cost:", ["O(1) worst case", "O(1) amortised", "O(log n) amortised", "O(n) amortised"], "O(1) amortised"),
            mcq("Sorting 1 million 32-bit integers with radix sort in base 2¹⁶ needs how many passes?", ["1", "2", "4", "32"], "2"),
        ],
    },
    5: {
        "AQ": [
            mcq("BFS explores vertices in order of:", ["degree", "distance (number of edges) from the source", "label", "finishing time"], "distance (number of edges) from the source"),
            mcq("Which data structure drives BFS?", ["stack", "queue", "heap", "hash table"], "queue"),
        ],
        "PA": [
            mcq("With adjacency lists, BFS and DFS run in:", ["O(V)", "O(E)", "O(V + E)", "O(V·E)"], "O(V + E)"),
            msq("A topological order exists if and only if the graph is:", ["directed", "acyclic", "connected", "weighted"], ["directed", "acyclic"]),
            num("An undirected graph with 6 vertices stored as adjacency lists has 7 edges. How many entries are there across all lists?", "14"),
        ],
        "GA": [
            mcq("During DFS on a directed graph, finding a back edge means the graph:", ["is disconnected", "has a cycle", "is bipartite", "is a tree"], "has a cycle"),
            mcq("A topological sort is the reverse of DFS:", ["discovery order", "finishing order", "edge order", "BFS level order"], "finishing order"),
            msq("Which problems are naturally solved with BFS?", ["Fewest moves to solve a puzzle", "Shortest path when all edges cost 1", "Ordering tasks with prerequisites", "Checking whether a graph is bipartite"], ["Fewest moves to solve a puzzle", "Shortest path when all edges cost 1", "Checking whether a graph is bipartite"]),
            num("In a complete undirected graph on 5 vertices, how many edges are there?", "10"),
            mcq("Which edge type can never appear in DFS on an undirected graph?", ["tree edge", "back edge", "cross edge", "none of these can appear"], "cross edge"),
        ],
    },
    6: {
        "AQ": [
            mcq("Dijkstra's algorithm requires edge weights to be:", ["integers", "non-negative", "distinct", "less than V"], "non-negative"),
            mcq("Memoisation means:", ["sorting the input first", "storing answers to subproblems so each is solved once", "using a greedy choice", "splitting the input in half"], "storing answers to subproblems so each is solved once"),
        ],
        "PA": [
            mcq("Using a binary heap, Dijkstra runs in:", ["O(V²)", "O((V + E) log V)", "O(VE)", "O(E)"], "O((V + E) log V)"),
            num("Naive recursive fib(n) calls itself how many times in total to compute fib(5), counting the first call? (fib(0)=0, fib(1)=1, both are base cases)", "15"),
            msq("Which belong to the SRTBOT recipe?", ["Subproblems", "Relate", "Topological order", "Branch and bound"], ["Subproblems", "Relate", "Topological order"]),
        ],
        "GA": [
            num("Length of the longest common subsequence of 'ABCBDAB' and 'BDCABA'?", "4"),
            num("Length of the longest strictly increasing subsequence of [10, 9, 2, 5, 3, 7, 101, 18]?", "4"),
            mcq("If a graph has a negative-weight edge but no negative cycle, which algorithm is guaranteed correct?", ["Dijkstra", "Bellman-Ford", "BFS", "DFS"], "Bellman-Ford"),
            mcq("The LCS DP on strings of lengths n and m runs in:", ["O(n + m)", "O(nm)", "O(2ⁿ)", "O(n log m)"], "O(nm)"),
            num("Minimum number of coins to make 11 using denominations {1, 2, 5}?", "3"),
        ],
    },
}

CODING = {
    1: {
        "PPA": [code(
            "Read an integer n, then a line of n space-separated integers. Print the index (0-based) of any peak: an element no smaller than its neighbours. If several peaks exist, print the one your O(log n) binary-search approach finds (for the tests here, the peak is unique).",
            [("5\n1 3 5 4 2", "2"), ("4\n1 2 3 4", "3")],
            [("1\n7", "0"), ("6\n9 7 5 3 2 1", "0"), ("7\n1 2 3 10 4 3 2", "3")])],
        "GrPA": [code(
            "Read a line of space-separated integers. Print how many distinct values it contains. Aim for O(n).",
            [("1 2 2 3 3 3", "3"), ("5", "1")],
            [("4 4 4 4", "1"), ("1 2 3 4 5 6 7 8 9 10", "10"), ("-1 1 -1 1 0", "3")])],
    },
    2: {
        "PPA": [code(
            "Read a line of space-separated integers and print them sorted ascending using merge sort that you write yourself (no sorted() or .sort()). Output space-separated.",
            [("5 2 4 6 1 3", "1 2 3 4 5 6"), ("1", "1")],
            [("3 3 1 2", "1 2 3 3"), ("10 -1 0 7", "-1 0 7 10"), ("9 8 7 6 5 4 3 2 1", "1 2 3 4 5 6 7 8 9")])],
        "GrPA": [code(
            "First line: k. Second line: space-separated integers. Print the k largest values in descending order, space-separated. Use a heap.",
            [("2\n5 1 9 3 7", "9 7"), ("1\n4 4 4", "4")],
            [("3\n1 2 3 4 5 6", "6 5 4"), ("4\n-5 -1 -3 -2 -4", "-1 -2 -3 -4"), ("2\n10 10 9", "10 10")])],
    },
    3: {
        "PPA": [code(
            "Read space-separated integers and insert them, in order, into a plain (unbalanced) BST. Print the height of the tree counting edges (a single node has height 0).",
            [("50 30 70 20 40", "2"), ("1 2 3 4", "3")],
            [("10", "0"), ("4 2 6 1 3 5 7", "2"), ("5 4 3 2 1 6", "4")])],
        "GrPA": [code(
            "Read space-separated integers, insert them into a BST in order, and print the pre-order traversal (root, left, right), space-separated. Ignore duplicates.",
            [("50 30 70 20 40 60 80", "50 30 20 40 70 60 80"), ("3 1 2", "3 1 2")],
            [("1 2 3", "1 2 3"), ("5 5 3 8", "5 3 8"), ("8 3 10 1 6 14 4 7 13", "8 3 1 6 4 7 10 14 13")])],
    },
    4: {
        "PPA": [code(
            "Read space-separated non-negative integers, each below 100. Sort them with counting sort and print them space-separated.",
            [("3 1 2 3 0", "0 1 2 3 3"), ("5", "5")],
            [("99 0 50 50 1", "0 1 50 50 99"), ("7 7 7", "7 7 7"), ("10 9 8 7", "7 8 9 10")])],
        "GrPA": [code(
            "Read a line of lowercase words separated by spaces. Print the word that appears most often. On a tie, print the word that comes first alphabetically.",
            [("the cat and the hat", "the"), ("b a", "a")],
            [("x y z y x y", "y"), ("apple banana apple banana", "apple"), ("solo", "solo")])],
    },
    5: {
        "PPA": [code(
            "First line: n m (vertices 0..n−1, m undirected edges). Next m lines: u v. Last line: s t. Print the fewest edges on a path from s to t, or -1 if unreachable.",
            [("4 3\n0 1\n1 2\n2 3\n0 3", "3"), ("3 1\n0 1\n0 2", "-1")],
            [("5 5\n0 1\n0 2\n1 3\n2 3\n3 4\n0 4", "3"), ("2 1\n0 1\n1 1", "0"), ("6 3\n0 1\n2 3\n4 5\n0 5", "-1")])],
        "GrPA": [code(
            "First line: n m (courses 0..n−1, m prerequisite pairs). Next m lines: a b meaning a must come before b. Print 'yes' if all courses can be completed (no cycle), otherwise 'no'.",
            [("3 2\n0 1\n1 2", "yes"), ("2 2\n0 1\n1 0", "no")],
            [("4 3\n0 1\n1 2\n2 0", "no"), ("4 0", "yes"), ("5 4\n0 1\n0 2\n1 3\n2 3", "yes")])],
    },
    6: {
        "PPA": [code(
            "Read two strings on separate lines and print the length of their longest common subsequence.",
            [("ABCBDAB\nBDCABA", "4"), ("abc\nabc", "3")],
            [("abc\ndef", "0"), ("AGGTAB\nGXTXAYB", "4"), ("a\nb", "0")])],
        "GrPA": [code(
            "First line: n m s (vertices 0..n−1, m directed edges, source s). Next m lines: u v w with w ≥ 0. Print the shortest distance from s to each vertex 0..n−1, space-separated, using -1 for unreachable vertices.",
            [("3 3 0\n0 1 4\n0 2 1\n2 1 2", "0 3 1"), ("2 0 0", "0 -1")],
            [("4 4 0\n0 1 1\n1 2 1\n0 2 5\n2 3 1", "0 1 2 3"), ("3 1 1\n1 2 7", "-1 0 7"), ("2 2 0\n0 1 3\n0 1 2", "0 2")])],
    },
}
