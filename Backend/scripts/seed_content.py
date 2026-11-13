"""Static demo content for ``scripts.seed_demo`` (courses, notes, questions, coding tasks)."""

# Each course: id, name, notes (week, title, markdown, reading url)
COURSES = [
    {
        "course_id": "PY101",
        "course_name": "Python Programming",
        "notes": [
            (1, "Variables, Types and Input/Output", """# Variables, Types and Input/Output

Python is **dynamically typed**: a name is bound to an object and the object carries the type. You do not declare types, but every value has one.

## Core types
- `int`, `float`, `bool`, `str` are *immutable* scalars: operations create new objects.
- `/` always returns a `float` (`3 / 2 == 1.5`), `//` is floor division and `%` is the remainder.
- Exponentiation (`**`) binds tighter than `*`, `//` and `%`, which bind tighter than `+` and `-`.

## Input and output
`input()` always returns a string, so convert explicitly:

```python
n = int(input("How many? "))
print(f"{n} squared is {n ** 2}")
```

f-strings (`f"{value:.2f}"`) are the preferred way to format output. Use `print(a, b, sep=", ", end="")` to control separators and line endings.

## Common pitfalls
1. Forgetting that `input()` returns text: `"2" + "3" == "23"`.
2. Comparing floats with `==`; prefer `math.isclose`.
3. Using a variable before it is assigned (a `NameError`).""", "https://docs.python.org/3/tutorial/introduction.html"),
            (2, "Control Flow and Functions", """# Control Flow and Functions

## Branching and loops
`if / elif / else` selects one branch. Python uses indentation, not braces, to delimit blocks.

- `for x in iterable:` loops over any iterable; `range(start, stop, step)` generates integers and **excludes** `stop`.
- `while cond:` repeats while the condition holds. `break` leaves the loop, `continue` skips to the next iteration.
- The `else` clause of a loop runs only if the loop was **not** ended by `break`.

## Functions
```python
def area(width, height=1):
    \"\"\"Return the area of a rectangle.\"\"\"
    return width * height
```
- Parameters may have defaults; keyword arguments make calls readable (`area(width=3, height=4)`).
- A function without `return` returns `None`.
- Never use a mutable default such as `def f(x=[])`; the list is shared between calls.

## Scope
Names are looked up **L**ocal, **E**nclosing, **G**lobal, **B**uilt-in (the LEGB rule). Assigning to a name inside a function makes it local unless declared `global` or `nonlocal`.""", "https://docs.python.org/3/tutorial/controlflow.html"),
            (3, "Lists, Dictionaries and Comprehensions", """# Lists, Dictionaries and Comprehensions

## Sequences
- `list` is mutable and ordered: `append`, `extend`, `insert`, `pop`, slicing `xs[1:4]`.
- `tuple` is immutable and hashable if its items are, so it can be a dictionary key.
- `set` stores unique items with O(1) average membership tests.

## Dictionaries
A `dict` maps hashable keys to values with O(1) average lookups.

```python
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
```
`d.get(k)` returns `None` for a missing key, `d.setdefault(k, v)` inserts a default, and `collections.Counter` does the counting above for you.

## Comprehensions
```python
squares = [x * x for x in range(5)]          # [0, 1, 4, 9, 16]
evens = {x for x in range(10) if x % 2 == 0}
lookup = {name: len(name) for name in names}
```
Comprehensions are concise and usually faster than an explicit loop, but keep them readable: if it needs more than one condition and a nested loop, use a normal `for`.""", "https://docs.python.org/3/tutorial/datastructures.html"),
            (4, "Classes and Exceptions", """# Classes and Exceptions

## Classes
A class bundles data and behaviour.

```python
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self.balance += amount
```
- `self` is the instance; `__init__` initialises it.
- Inheritance (`class Savings(Account):`) reuses behaviour; call `super().__init__(...)` to extend it.
- Special methods such as `__repr__`, `__eq__` and `__len__` let your objects behave like built-ins.

## Exceptions
```python
try:
    value = int(text)
except ValueError:
    value = 0
else:
    print("parsed ok")
finally:
    print("always runs")
```
Catch the **most specific** exception you can handle, never a bare `except:`. Define your own exception by subclassing `Exception`. Use context managers (`with open(path) as f:`) so resources are released even when errors occur.""", "https://docs.python.org/3/tutorial/classes.html"),
        ],
        "ga1": [
            ("What is the output of print(type(3 / 2))?", "MCQ", ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'complex'>"], ["<class 'float'>"]),
            ("Which of the following are immutable types in Python?", "MSQ", ["list", "tuple", "str", "dict", "int"], ["tuple", "str", "int"]),
            ("What is the value of 7 // 2 + 7 % 2 ** 2 ?", "Numeric", [], [6]),
        ],
        "ga2": [
            ("Which keyword exits the innermost loop immediately?", "MCQ", ["continue", "break", "pass", "return"], ["break"]),
            ("How many times does the body of `for i in range(2, 11, 3)` run?", "Numeric", [], [3]),
        ],
        "aq": [
            ("Which expression builds the list of squares of 0..4?", "MCQ", ["[x * x for x in range(5)]", "[x ** 2 for x in range(1, 5)]", "{x * x for x in range(5)}", "(x * x for x in range(5))"], ["[x * x for x in range(5)]"]),
            ("Which of these read a key from a dict WITHOUT raising KeyError for a missing key?", "MSQ", ["d.get(k)", "d[k]", "d.setdefault(k, 0)", "d.pop(k)"], ["d.get(k)", "d.setdefault(k, 0)"]),
        ],
    },
    {
        "course_id": "DS201",
        "course_name": "Data Structures",
        "notes": [
            (1, "Arrays and Algorithm Analysis", """# Arrays and Algorithm Analysis

## Why analysis?
Running time depends on the machine, so we count **basic operations as a function of input size n** and describe growth with Big-O.

| Class | Name | Example |
|---|---|---|
| O(1) | constant | array index lookup |
| O(log n) | logarithmic | binary search |
| O(n) | linear | scan an array |
| O(n log n) | linearithmic | merge sort |
| O(n^2) | quadratic | nested loops, insertion sort |

## Arrays
An array stores elements contiguously, giving O(1) random access. Inserting or deleting in the middle shifts elements: O(n). A *dynamic array* (Python `list`) doubles its capacity when full, so `append` is **amortised O(1)**.

## Rules of thumb
- Drop constants and lower-order terms: `3n^2 + 5n + 2` is O(n^2).
- Sequential steps add, nested loops multiply.
- Big-O describes the *upper bound*; always say whether you mean worst, average or best case.""", "https://en.wikipedia.org/wiki/Big_O_notation"),
            (2, "Linked Lists, Stacks and Queues", """# Linked Lists, Stacks and Queues

## Singly linked list
Each node stores a value and a pointer to the next node.

```python
class Node:
    def __init__(self, value, next=None):
        self.value, self.next = value, next
```
- Insert/delete at the head: O(1). Access by index or search: O(n).
- Reversing a list in place uses three pointers (`prev`, `curr`, `next`) and one pass.

## Stack (LIFO)
`push` and `pop` at the same end, both O(1). Uses: function call stack, undo, matching brackets, depth-first search.

## Queue (FIFO)
`enqueue` at the back, `dequeue` at the front. In Python use `collections.deque` (O(1) at both ends); `list.pop(0)` is O(n).

## Example: balanced brackets
Scan the string; push every opening bracket; on a closing bracket pop and compare. The string is balanced if the stack is empty at the end and no mismatch occurred.""", "https://en.wikipedia.org/wiki/Stack_(abstract_data_type)"),
            (3, "Hash Tables and Binary Search Trees", """# Hash Tables and Binary Search Trees

## Hash tables
A hash function maps a key to a bucket index. With a good function and a bounded **load factor** (items / buckets), `insert`, `lookup` and `delete` are **O(1) on average**.

Collisions are resolved by:
- *chaining*: each bucket holds a small list of entries;
- *open addressing*: probe for the next free slot.

Hash tables do **not** keep keys ordered, so "find the minimum" or "iterate in sorted order" costs O(n) or more.

## Binary search trees (BST)
Every node's left subtree holds smaller keys and its right subtree larger keys. An in-order traversal yields sorted output.
- Search/insert/delete cost O(h) where h is the height.
- Balanced tree: h = O(log n). Inserting sorted data into a plain BST degenerates into a linked list: h = O(n).
- Self-balancing trees (AVL, red-black) keep h = O(log n) by rotating nodes.""", "https://en.wikipedia.org/wiki/Binary_search_tree"),
            (4, "Sorting and Searching", """# Sorting and Searching

## Binary search
On a **sorted** array, compare the target with the middle element and discard half the range each step: O(log n).

```python
def binary_search(xs, target):
    lo, hi = 0, len(xs) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if xs[mid] == target:
            return mid
        if xs[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

## Sorting algorithms
| Algorithm | Worst | Average | Stable | Notes |
|---|---|---|---|---|
| Insertion sort | O(n^2) | O(n^2) | yes | great for tiny / nearly sorted inputs |
| Merge sort | O(n log n) | O(n log n) | yes | needs O(n) extra space |
| Quick sort | O(n^2) | O(n log n) | no | in place, fast in practice |
| Heap sort | O(n log n) | O(n log n) | no | in place |

A sort is **stable** if equal keys keep their original relative order. Any comparison-based sort needs Omega(n log n) comparisons in the worst case.""", "https://en.wikipedia.org/wiki/Sorting_algorithm"),
        ],
        "ga1": [
            ("What is the worst-case time complexity of binary search on a sorted array of n elements?", "MCQ", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], ["O(log n)"]),
            ("Which operations are O(1) on average in a well-sized hash table?", "MSQ", ["insert", "lookup", "delete", "iterate in sorted order", "find the minimum key"], ["insert", "lookup", "delete"]),
            ("What is the maximum number of comparisons binary search needs on a sorted array of 15 elements?", "Numeric", [], [4]),
        ],
        "ga2": [
            ("Which data structure follows the LIFO principle?", "MCQ", ["Queue", "Stack", "Heap", "Hash table"], ["Stack"]),
            ("What is the height of a perfectly balanced BST with 7 nodes (a single node has height 0)?", "Numeric", [], [2]),
        ],
        "aq": [
            ("What is the worst-case cost of inserting into a plain (unbalanced) BST with n nodes?", "MCQ", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], ["O(n)"]),
            ("Which of these sorting algorithms are stable?", "MSQ", ["Merge sort", "Insertion sort", "Quick sort", "Heap sort"], ["Merge sort", "Insertion sort"]),
        ],
    },
    {
        "course_id": "ML301",
        "course_name": "Machine Learning Basics",
        "notes": [
            (1, "What is Machine Learning?", """# What is Machine Learning?

Machine learning builds models that **learn patterns from data** instead of following hand-written rules.

## Paradigms
- **Supervised learning**: labelled examples `(x, y)`. *Regression* predicts a number (house price); *classification* predicts a category (spam / not spam).
- **Unsupervised learning**: no labels; find structure, e.g. clustering or dimensionality reduction.
- **Reinforcement learning**: an agent learns from rewards by interacting with an environment.

## The standard workflow
1. Define the problem and the success metric.
2. Collect and clean data; split it into **train / validation / test** sets.
3. Choose features and a model family.
4. Train on the training set, tune on validation data.
5. Evaluate **once** on the held-out test set.

## Key vocabulary
*Features* are inputs, the *label* (target) is the output to predict, *parameters* are learned by training, *hyperparameters* (learning rate, tree depth) are set by you.""", "https://scikit-learn.org/stable/getting_started.html"),
            (2, "Linear Regression and Gradient Descent", """# Linear Regression and Gradient Descent

## The model
Predict a value as a weighted sum of features: `y_hat = w0 + w1*x1 + ... + wd*xd`.

## Loss
Training chooses weights that minimise the **mean squared error**:

`MSE = (1/n) * sum((y_i - y_hat_i)^2)`

## Gradient descent
Repeat: `w <- w - alpha * dMSE/dw` where **alpha is the learning rate**.
- Too small: training is slow.
- Too large: the loss oscillates or diverges.
- Standardising features (zero mean, unit variance) makes descent converge faster.

For small problems the closed-form *normal equation* gives the optimum directly.

## Regularisation
Adding a penalty on weight size (Ridge uses `sum(w^2)`, Lasso uses `sum(|w|)`) discourages very large weights and reduces overfitting. Lasso can drive some weights exactly to zero, acting as feature selection.""", "https://scikit-learn.org/stable/modules/linear_model.html"),
            (3, "Classification: Logistic Regression and Decision Trees", """# Classification: Logistic Regression and Decision Trees

## Logistic regression
Despite its name it is a classifier. It computes a score `z = w.x + b` and squashes it with the sigmoid `p = 1 / (1 + e^-z)` to get a probability. Predict class 1 when `p >= 0.5` (the threshold can be tuned). It is trained by minimising **log loss** (cross-entropy).

## Decision trees
A tree asks a sequence of yes/no questions about features. At each node the algorithm picks the split that most reduces **impurity** (Gini or entropy).
- Easy to interpret and need little preprocessing.
- Deep trees memorise training data (**overfit**); limit `max_depth`, require a minimum samples per leaf, or prune.

## Ensembles
*Random forests* average many trees trained on random subsets of data and features, trading interpretability for accuracy and stability. *Gradient boosting* builds trees sequentially, each correcting the previous errors.""", "https://scikit-learn.org/stable/modules/tree.html"),
            (4, "Evaluation, Overfitting and Cross-Validation", """# Evaluation, Overfitting and Cross-Validation

## Overfitting vs underfitting
- **Overfitting**: very good training score, much worse validation score; the model memorised noise.
- **Underfitting**: poor scores on both; the model is too simple.

Remedies for overfitting: more data, regularisation, simpler models, early stopping, dropout (for neural networks).

## Cross-validation
In *k-fold* cross-validation split the data into k folds; train on k-1 and validate on the remaining fold, rotating k times, then average the scores. It gives a more reliable estimate than a single split, especially for small datasets.

## Metrics for classification
- **Accuracy** = correct / total (misleading on imbalanced data).
- **Precision** = TP / (TP + FP): of the predicted positives, how many were right?
- **Recall** = TP / (TP + FN): of the real positives, how many did we find?
- **F1** = harmonic mean of precision and recall.

Always keep a final **test set** untouched until the very end to avoid leaking information from it into model choices.""", "https://scikit-learn.org/stable/modules/cross_validation.html"),
        ],
        "ga1": [
            ("Which of the following is an example of supervised learning?", "MCQ", ["Grouping customers by behaviour with no labels", "Predicting house prices from labelled past sales", "An agent learning to play a game from rewards", "Compressing images with PCA"], ["Predicting house prices from labelled past sales"]),
            ("Which of these are regression tasks?", "MSQ", ["Predicting tomorrow's temperature", "Detecting spam e-mail", "Estimating a used car's price", "Classifying handwritten digits"], ["Predicting tomorrow's temperature", "Estimating a used car's price"]),
            ("A classifier makes 40 correct predictions out of 50. What is its accuracy in percent?", "Numeric", [], [80]),
        ],
        "ga2": [
            ("A model has 99% training accuracy but only 70% validation accuracy. This most likely indicates:", "MCQ", ["Underfitting", "Overfitting", "Perfect generalisation", "Data leakage from the test set"], ["Overfitting"]),
            ("A classifier has TP = 30 and FP = 10. What is its precision?", "Numeric", [], [0.75]),
        ],
        "aq": [
            ("Which hyperparameter controls the step size of gradient descent?", "MCQ", ["Regularisation strength", "Learning rate", "Tree depth", "Number of folds"], ["Learning rate"]),
            ("Which of these help reduce overfitting?", "MSQ", ["Adding regularisation", "Collecting more training data", "Making the model more complex", "Early stopping"], ["Adding regularisation", "Collecting more training data", "Early stopping"]),
        ],
    },
]

# Coding assignments: (course, week, assgn_type, language, title/question, public tests, private tests, deadline offset days)
CODING = [
    {
        "key": "fizzbuzz", "course_id": "PY101", "week": 2, "assgn_type": "GrPA", "language": "python", "days": 6,
        "question": "**FizzBuzz**\n\nRead an integer `n` from standard input and print the numbers from 1 to `n`, one per line. For multiples of 3 print `Fizz`, for multiples of 5 print `Buzz`, and for multiples of both print `FizzBuzz`.",
        "public": [("5", "1\n2\nFizz\n4\nBuzz")],
        "private": [("1", "1"), ("3", "1\n2\nFizz"),
                    ("15", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"),
                    ("10", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz")],
    },
    {
        "key": "palindrome", "course_id": "PY101", "week": 3, "assgn_type": "PPA", "language": "python", "days": 10,
        "question": "**Palindrome check**\n\nRead one line of text. Ignoring case and every character that is not a letter or digit, print `YES` if it reads the same forwards and backwards, otherwise `NO`.",
        "public": [("A man, a plan, a canal: Panama", "YES"), ("hello", "NO")],
        "private": [("Was it a car or a cat I saw?", "YES"), ("ab", "NO"), ("x", "YES"), ("No lemon, no melon", "YES")],
    },
    {
        "key": "brackets", "course_id": "DS201", "week": 2, "assgn_type": "PPA", "language": "js", "days": 8,
        "question": "**Balanced brackets**\n\nRead one line containing only the characters `()[]{}`. Print `balanced` if every bracket is closed by the matching type in the correct order, otherwise `unbalanced`. (Hint: think about which data structure fits.)",
        "public": [("()[]{}", "balanced"), ("(]", "unbalanced")],
        "private": [("{[()]}", "balanced"), ("((", "unbalanced"), ("([)]", "unbalanced"), ("{[()()]}", "balanced")],
    },
    {
        "key": "bsearch", "course_id": "DS201", "week": 4, "assgn_type": "GrPA", "language": "java", "days": 12,
        "question": "**Binary search**\n\nInput: first line `n`, second line `n` integers in ascending order, third line a target integer. Print the 0-based index of the target, or `-1` if it is absent. Your solution must run in O(log n). The class must be named `Main`.",
        "public": [("5\n1 3 5 7 9\n7", "3"), ("5\n1 3 5 7 9\n4", "-1")],
        "private": [("1\n2\n2", "0"), ("6\n-5 -2 0 4 8 20\n-5", "0"), ("6\n-5 -2 0 4 8 20\n20", "5"), ("3\n1 2 3\n10", "-1")],
    },
    {
        "key": "meanvar", "course_id": "ML301", "week": 2, "assgn_type": "PPA", "language": "python", "days": 9,
        "question": "**Mean and variance**\n\nRead one line of space separated numbers. Print the mean and the *population* variance (divide by n) in the exact form `mean=X.XX variance=Y.YY` (two decimals).",
        "public": [("1 2 3 4 5", "mean=3.00 variance=2.00")],
        "private": [("10 10 10", "mean=10.00 variance=0.00"), ("2 4 4 4 5 5 7 9", "mean=5.00 variance=4.00"),
                    ("1.5 2.5", "mean=2.00 variance=0.25")],
    },
]

REFERENCE_SOLUTIONS = {
    "fizzbuzz": ("python", """n = int(input())
for i in range(1, n + 1):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
"""),
    "palindrome": ("python", """s = [c.lower() for c in input() if c.isalnum()]
print("YES" if s == s[::-1] else "NO")
"""),
    "brackets": ("js", """const s = require('fs').readFileSync(0, 'utf8').trim();
const pairs = { ')': '(', ']': '[', '}': '{' };
const stack = [];
let ok = true;
for (const c of s) {
  if ('([{'.includes(c)) stack.push(c);
  else if (stack.pop() !== pairs[c]) { ok = false; break; }
}
console.log(ok && stack.length === 0 ? 'balanced' : 'unbalanced');
"""),
    "bsearch": ("java", """import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        int target = in.nextInt();
        int lo = 0, hi = n - 1, ans = -1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (a[mid] == target) { ans = mid; break; }
            if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
        }
        System.out.println(ans);
    }
}
"""),
    "meanvar": ("python", """xs = list(map(float, input().split()))
m = sum(xs) / len(xs)
v = sum((x - m) ** 2 for x in xs) / len(xs)
print(f"mean={m:.2f} variance={v:.2f}")
"""),
}

FLASHCARDS = [
    ("PY101", 1, "Why does `3 / 2` give 1.5 but `3 // 2` give 1?", "`/` is true division and always returns a float; `//` is floor division and rounds down to the nearest integer."),
    ("PY101", 3, "List comprehension vs generator expression", "`[x*x for x in xs]` builds the whole list in memory; `(x*x for x in xs)` produces items lazily, one at a time."),
    ("DS201", 1, "What does amortised O(1) append mean?", "Occasional resizes cost O(n), but spread over many appends the average cost per append is constant."),
    ("ML301", 4, "Precision vs recall", "Precision = TP/(TP+FP): how many predicted positives were right. Recall = TP/(TP+FN): how many real positives were found."),
]
