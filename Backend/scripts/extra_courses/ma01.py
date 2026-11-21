"""MA01 - Linear Algebra, Visually.

Lectures are 3Blue1Brown's "Essence of linear algebra" series.
"""
from scripts.extra_courses.helpers import lecture, mcq, msq, num, code, note

SERIES = {"label": "Essence of linear algebra (full playlist)", "url": "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab"}
SITE = {"label": "3Blue1Brown lessons and transcripts", "url": "https://www.3blue1brown.com/topics/linear-algebra"}
SRC = "3Blue1Brown"

COURSE = {
    "course_id": "MA01",
    "course_name": "Linear Algebra, Visually",
    "description": "Vectors, matrices, determinants and eigenvectors, taught through pictures first and formulas second. You'll finish knowing what a matrix does to space, not just how to multiply one.",
    "instructor": "Course team, with lectures from 3Blue1Brown",
    "level": "Beginner",
    "total_weeks": 5,
    "color": "#1d4ed8",
}

WEEK_TITLES = {
    1: "Vectors and span",
    2: "Matrices as transformations",
    3: "Determinants and inverses",
    4: "Dot products, cross products, Cramer's rule",
    5: "Change of basis and eigenvectors",
    6: "Where linear algebra meets machine learning",
}

LECTURES = [
    lecture(1, 1, "Vectors: what even are they?", "fNk_zzaMoSs", SRC,
            "Three ways of seeing a vector: an arrow in space, a list of numbers, and something you can add and scale. The course uses all three, and this video shows how they fit together.",
            """- A vector in 2-D is an arrow from the origin; its coordinates say how far to walk along x and y.
- Adding vectors means placing them tip to tail.
- Scaling stretches, squishes, or flips a vector.
- Linear algebra is really about these two operations.""", [SERIES, SITE]),
    lecture(1, 2, "Linear combinations, span, and basis vectors", "k7RM-ot2NWY", SRC,
            "Every pair of coordinates is secretly a recipe: scale î and ĵ, then add. That idea leads straight to span, linear dependence and the meaning of a basis.",
            """- Linear combination: a·v + b·w.
- Span = every vector you can reach with linear combinations.
- Vectors are *linearly dependent* if one is already in the span of the others.
- A basis is a linearly independent set that spans the space.""", [SERIES, SITE]),
    lecture(2, 1, "Linear transformations and matrices", "kYB8IZa5AuE", SRC,
            "A matrix is a record of where the basis vectors land. Once you see it that way, matrix-vector multiplication stops being a rule to memorise.",
            """- Linear transformation: grid lines stay parallel and evenly spaced, origin stays fixed.
- The columns of a matrix are where î and ĵ land.
- Multiplying a matrix by a vector = that same linear combination of the columns.
- Rotation by 90° counter-clockwise: [[0, −1], [1, 0]].""", [SERIES, SITE]),
    lecture(2, 2, "Matrix multiplication as composition", "XkY2DOUCWMU", SRC,
            "Applying one transformation after another is itself a transformation, and its matrix is the product. That's why order matters and associativity is obvious.",
            """- AB means: apply B first, then A.
- In general AB ≠ BA; try a rotation and a shear.
- (AB)C = A(BC) because both apply C, then B, then A.
- Column j of AB is A times column j of B.""", [SERIES, SITE]),
    lecture(2, 3, "Three-dimensional linear transformations", "rHLEWRxRGiM", SRC,
            "Everything from 2-D carries over to 3-D: three basis vectors, a 3×3 matrix, the same column picture.",
            """- In 3-D the columns record where î, ĵ, k̂ land.
- Multiplication is still composition.
- Good practice: describe what [[1,0,0],[0,0,−1],[0,1,0]] does (a rotation about the x-axis).""", [SERIES, SITE]),
    lecture(3, 1, "The determinant", "Ip3X9LOh2dk", SRC,
            "The determinant measures how much a transformation scales area (or volume), and its sign says whether space gets flipped.",
            """- det = area scale factor in 2-D, volume scale factor in 3-D.
- det = 0 means space is squished into a lower dimension.
- Negative det means orientation flips.
- det(AB) = det(A)·det(B).
- For [[a, b], [c, d]], det = ad − bc.""", [SERIES, SITE]),
    lecture(3, 2, "Inverse matrices, column space and null space", "uQhTuRlWMxw", SRC,
            "Solving Ax = v is asking which vector lands on v. This lecture links that to inverses, rank, column space and null space.",
            """- If det(A) ≠ 0, A⁻¹ exists and x = A⁻¹v is the unique solution.
- Rank = dimension of the column space (the output space).
- Null space (kernel) = vectors that land on zero.
- Rank + nullity = number of columns.""", [SERIES, SITE]),
    lecture(3, 3, "Nonsquare matrices as transformations between dimensions", "v8VSDg_WQlA", SRC,
            "A 3×2 matrix takes 2-D vectors into 3-D. A short video on what non-square matrices mean geometrically.",
            """- An m×n matrix maps ℝⁿ → ℝᵐ.
- Number of columns = input dimension; number of rows = output dimension.
- A 1×2 matrix squashes the plane onto a line, which leads into dot products.""", [SERIES, SITE]),
    lecture(4, 1, "Dot products and duality", "LyGKycYT2v0", SRC,
            "Why does multiplying coordinates and adding them up have anything to do with projection? The answer is duality: every 1×n matrix secretly corresponds to a vector.",
            """- v·w = |v||w|cos θ.
- Positive: similar direction. Zero: perpendicular. Negative: opposite-ish.
- v·w is the length of w's projection onto v, times |v|.
- A linear map to the number line is the same as dotting with some vector.""", [SERIES, SITE]),
    lecture(4, 2, "Cross products", "eu6i7WJeinw", SRC,
            "The 2-D cross product as a signed area, and the 3-D cross product as a vector perpendicular to both inputs.",
            """- 2-D: v×w = det([v w]), the signed parallelogram area.
- 3-D: v×w is perpendicular to both, with length equal to the parallelogram area.
- Right-hand rule for direction.
- v×w = −(w×v).""", [SERIES, SITE]),
    lecture(4, 3, "Cross products in the light of linear transformations", "BaM7OCEm3G0", SRC,
            "Where the 3-D cross product formula actually comes from, using the duality idea from the dot product lecture.",
            """- Fix v and w; the map u ↦ det([u v w]) is linear.
- By duality it equals dotting u with some vector p.
- That p is exactly v × w.""", [SERIES, SITE]),
    lecture(4, 4, "Cramer's rule, explained geometrically", "jBsC34PxzoM", SRC,
            "Cramer's rule looks like a random formula, but it falls out of how a transformation scales areas.",
            """- Solving Ax = b: x_i = det(A_i) / det(A), where A_i replaces column i with b.
- Geometric idea: the signed area built from î and x scales by det(A).
- Elegant, but Gaussian elimination is faster in practice.""", [SERIES, SITE]),
    lecture(5, 1, "Change of basis", "P2LTAUO1TdA", SRC,
            "How to translate a vector between two coordinate systems, and how to express a transformation in someone else's basis.",
            """- If the columns of P are a new basis written in our coordinates, P converts their coordinates to ours.
- P⁻¹ converts ours to theirs.
- P⁻¹AP is the transformation A as seen in the new basis.""", [SERIES, SITE]),
    lecture(5, 2, "Eigenvectors and eigenvalues", "PFDu9oVAE-g", SRC,
            "Some vectors stay on their own span during a transformation and only get stretched. Those are eigenvectors, and finding them makes hard problems easy.",
            """- Av = λv: v is an eigenvector, λ its eigenvalue.
- Find λ by solving det(A − λI) = 0.
- An eigenbasis makes the matrix diagonal: P⁻¹AP = D.
- Diagonal matrices are easy to raise to powers.
- Rotations in 2-D (other than 0° and 180°) have no real eigenvectors.""", [SERIES, SITE]),
]

PENDING_LECTURES = [
    lecture(5, 3, "Abstract vector spaces", "TgKwz5Ikpc8", SRC,
            "Functions are vectors too. The series ends by asking what 'vector' really means.",
            "- Anything you can add and scale, following the axioms, is a vector space.\n- Derivative is a linear operator on polynomials.", [SERIES, SITE]),
    lecture(6, 1, "But what is a neural network?", "aircAruvnKk", SRC,
            "A first look at a neural network as layers of numbers connected by matrices.", "- Each layer: a = σ(Wa_prev + b).", [SITE]),
    lecture(6, 2, "Gradient descent, how neural networks learn", "IHZwWFHWa-w", SRC,
            "Training as rolling downhill on a cost function.", "- Gradient points uphill; step the other way.", [SITE]),
    lecture(6, 3, "What is backpropagation really doing?", "Ilg3gGewQ5U", SRC,
            "An intuitive walkthrough of backpropagation.", "- Each weight's nudge is proportional to its effect on the cost.", [SITE]),
    lecture(6, 4, "Backpropagation calculus", "tIeHLnjs5U8", SRC,
            "The chain rule behind backpropagation.", "- ∂C/∂w = ∂z/∂w · ∂a/∂z · ∂C/∂a.", [SITE]),
]

NOTES = [
    note(1, "Week 1 reading: vectors three ways", """
<h3>Arrow, list, or abstract thing?</h3>
<p>Physicists think of arrows, computer scientists think of lists, and mathematicians think of anything that can be added and scaled. In this course we move between the first two all the time. The arrow tells you what is happening; the list lets you compute it.</p>
<h3>Worked example</h3>
<p>Is (3, 5) in the span of (1, 2) and (2, 4)? No: (2, 4) is just 2·(1, 2), so both vectors lie on the same line, and (3, 5) is not on that line.</p>
<h3>Try this</h3>
<ul><li>Write (4, 1) as a combination of (1, 1) and (1, −1).</li>
<li>Find three vectors in ℝ³ that do <i>not</i> span ℝ³.</li></ul>
"""),
    note(2, "Week 2 reading: reading a matrix", """
<h3>Columns first</h3>
<p>Before computing anything, read each column as "where a basis vector goes." For example, <code>[[2, 0], [0, 3]]</code> sends î to (2, 0) and ĵ to (0, 3), so it stretches x by 2 and y by 3.</p>
<h3>Common transformations</h3>
<table>
<tr><th>Matrix</th><th>Effect</th></tr>
<tr><td>[[0, −1], [1, 0]]</td><td>Rotate 90° anticlockwise</td></tr>
<tr><td>[[1, 1], [0, 1]]</td><td>Shear to the right</td></tr>
<tr><td>[[1, 0], [0, −1]]</td><td>Reflect across the x-axis</td></tr>
<tr><td>[[k, 0], [0, k]]</td><td>Scale everything by k</td></tr>
</table>
<h3>Order matters</h3>
<p>Rotate then shear is not the same as shear then rotate. Check it by tracking where î goes.</p>
"""),
    note(3, "Week 3 reading: when can you undo a transformation?", """
<h3>The determinant as a warning light</h3>
<p>If det(A) = 0, the transformation squashes space into a line or a point. Information is lost and there is no inverse. If det(A) ≠ 0, every output came from exactly one input.</p>
<h3>Rank and null space in one picture</h3>
<p>A 3×3 matrix with rank 2 squashes space onto a plane. Since one dimension is lost, a whole line of vectors (the null space) lands on zero.</p>
<h3>Quick check</h3>
<p>det([[2, 1], [4, 2]]) = 2·2 − 1·4 = 0, and indeed the second column is half the first.</p>
"""),
    note(4, "Week 4 reading: projections and areas", """
<h3>The dot product in practice</h3>
<p>Cosine similarity, used to compare documents and embeddings, is just v·w / (|v||w|). The CS01 document-distance lecture uses exactly this.</p>
<h3>The cross product in practice</h3>
<p>In graphics, the cross product of two triangle edges gives the surface normal, which lighting calculations depend on.</p>
<h3>Worked example</h3>
<p>(1, 2, 3) × (4, 5, 6) = (2·6 − 3·5, 3·4 − 1·6, 1·5 − 2·4) = (−3, 6, −3).</p>
"""),
    note(5, "Week 5 reading: eigenvectors earn their keep", """
<h3>Why bother?</h3>
<p>Computing A¹⁰⁰ directly is painful. If A = PDP⁻¹ with D diagonal, then A¹⁰⁰ = PD¹⁰⁰P⁻¹, and raising a diagonal matrix to a power just means raising each entry.</p>
<h3>Worked example</h3>
<p>A = [[2, 0], [0, 3]] is already diagonal: eigenvalues 2 and 3, eigenvectors î and ĵ.</p>
<p>A = [[2, 1], [0, 3]]: det(A − λI) = (2 − λ)(3 − λ), so λ = 2 and λ = 3. For λ = 3, solve (A − 3I)v = 0 to get v = (1, 1).</p>
<h3>Where you'll meet them</h3>
<p>PageRank, principal component analysis, vibration modes, Markov chains, and quantum mechanics.</p>
"""),
]

QUESTIONS = {
    1: {
        "AQ": [
            mcq("Adding vectors geometrically means:", ["placing them tip to tail", "multiplying their lengths", "averaging their angles", "taking the longer one"], "placing them tip to tail"),
            num("What is the x-coordinate of 3·(2, −1) + (1, 4)?", "7"),
        ],
        "PA": [
            mcq("The span of a single non-zero vector in ℝ² is:", ["a point", "a line through the origin", "the whole plane", "a circle"], "a line through the origin"),
            msq("Which sets are linearly dependent?", ["{(1, 2), (2, 4)}", "{(1, 0), (0, 1)}", "{(1, 1), (2, 2), (0, 1)}", "{(0, 0), (1, 0)}"], ["{(1, 2), (2, 4)}", "{(1, 1), (2, 2), (0, 1)}", "{(0, 0), (1, 0)}"]),
            num("If (4, 1) = a·(1, 1) + b·(1, −1), what is a?", "2.5"),
        ],
        "GA": [
            mcq("How many vectors are in any basis of ℝ³?", ["2", "3", "4", "infinitely many"], "3"),
            msq("Which of these span ℝ²?", ["{(1, 0), (0, 1)}", "{(1, 1), (1, −1)}", "{(2, 4), (1, 2)}", "{(1, 0), (0, 1), (1, 1)}"], ["{(1, 0), (0, 1)}", "{(1, 1), (1, −1)}", "{(1, 0), (0, 1), (1, 1)}"]),
            num("What is the length of the vector (3, 4)?", "5"),
            mcq("The span of two linearly independent vectors in ℝ³ is:", ["a line", "a plane through the origin", "all of ℝ³", "a point"], "a plane through the origin"),
            num("If (4, 1) = a·(1, 1) + b·(1, −1), what is b?", "1.5"),
        ],
    },
    2: {
        "AQ": [
            mcq("The first column of a 2×2 matrix tells you where ___ lands.", ["ĵ", "î", "the origin", "(1, 1)"], "î"),
            mcq("Under a linear transformation, the origin:", ["can move anywhere", "stays fixed", "moves to (1, 1)", "doubles"], "stays fixed"),
        ],
        "PA": [
            num("[[1, 2], [3, 4]] times (1, 1) gives (x, y). What is y?", "7"),
            mcq("Which matrix rotates the plane 90° anticlockwise?", ["[[0, −1], [1, 0]]", "[[0, 1], [−1, 0]]", "[[1, 0], [0, −1]]", "[[−1, 0], [0, −1]]"], "[[0, −1], [1, 0]]"),
            msq("Which are linear transformations of the plane?", ["Rotation about the origin", "Shift everything right by 1", "Reflection across the y-axis", "Shear"], ["Rotation about the origin", "Reflection across the y-axis", "Shear"]),
        ],
        "GA": [
            mcq("The product AB corresponds to applying:", ["A first, then B", "B first, then A", "A and B simultaneously", "whichever has the larger determinant first"], "B first, then A"),
            num("Compute the top-left entry of [[1, 2], [3, 4]] × [[5, 6], [7, 8]].", "19"),
            num("Compute the bottom-right entry of [[1, 2], [3, 4]] × [[5, 6], [7, 8]].", "50"),
            msq("Which statements always hold for square matrices A, B, C?", ["(AB)C = A(BC)", "AB = BA", "A(B + C) = AB + AC", "(AB)ᵀ = AᵀBᵀ"], ["(AB)C = A(BC)", "A(B + C) = AB + AC"]),
            mcq("A 3×3 matrix describes a transformation of:", ["the plane", "3-D space", "a line", "4-D space"], "3-D space"),
        ],
    },
    3: {
        "AQ": [
            mcq("A determinant of 0 means the transformation:", ["is a rotation", "squishes space into a lower dimension", "doubles areas", "flips orientation"], "squishes space into a lower dimension"),
            num("det([[3, 0], [0, 2]]) = ?", "6"),
        ],
        "PA": [
            num("det([[1, 2], [3, 4]]) = ?", "-2"),
            mcq("A negative determinant means:", ["the matrix is not invertible", "orientation is flipped", "areas shrink", "the matrix is non-square"], "orientation is flipped"),
            msq("Which matrices are invertible?", ["[[1, 2], [2, 4]]", "[[0, 1], [1, 0]]", "[[2, 0], [0, 0]]", "[[1, 1], [0, 1]]"], ["[[0, 1], [1, 0]]", "[[1, 1], [0, 1]]"]),
        ],
        "GA": [
            num("If det(A) = 3 and det(B) = −2, what is det(AB)?", "-6"),
            num("A 4×4 matrix has rank 3. What is the dimension of its null space?", "1"),
            mcq("A 2×3 matrix maps vectors from:", ["ℝ² to ℝ³", "ℝ³ to ℝ²", "ℝ² to ℝ²", "ℝ³ to ℝ³"], "ℝ³ to ℝ²"),
            msq("If det(A) ≠ 0, which are true?", ["Ax = b has exactly one solution for every b", "The null space contains only 0", "The rank is less than n", "A⁻¹ exists"], ["Ax = b has exactly one solution for every b", "The null space contains only 0", "A⁻¹ exists"]),
            num("det(2I) for the 3×3 identity I = ?", "8"),
        ],
    },
    4: {
        "AQ": [
            num("(1, 2, 3) · (4, 5, 6) = ?", "32"),
            mcq("If v · w = 0 (both non-zero), the vectors are:", ["parallel", "perpendicular", "equal", "opposite"], "perpendicular"),
        ],
        "PA": [
            mcq("The 3-D cross product v × w is:", ["a number", "perpendicular to v and w", "parallel to v", "always a unit vector"], "perpendicular to v and w"),
            num("2-D cross product (3, 1) × (2, 2), i.e. det of the matrix with those columns = ?", "4"),
            msq("Which are true?", ["v · w = w · v", "v × w = w × v", "v × v = 0", "|v × w| = parallelogram area"], ["v · w = w · v", "v × v = 0", "|v × w| = parallelogram area"]),
        ],
        "GA": [
            num("The y-component of (1, 2, 3) × (4, 5, 6) is?", "6"),
            mcq("Cramer's rule gives x_i as:", ["det(A) / det(A_i)", "det(A_i) / det(A)", "trace(A_i) / trace(A)", "det(A_i) · det(A)"], "det(A_i) / det(A)"),
            num("Using Cramer's rule on 2x + y = 5, x + 3y = 10, what is x?", "1"),
            mcq("Cosine similarity between v and w is:", ["v · w", "v · w / (|v||w|)", "|v × w|", "|v| − |w|"], "v · w / (|v||w|)"),
            num("Area of the triangle with vertices (0, 0), (4, 0), (0, 3)?", "6"),
        ],
    },
    5: {
        "AQ": [
            mcq("An eigenvector of A is a non-zero vector v with:", ["Av = 0", "Av = λv", "Av = v + λ", "Aᵀv = v"], "Av = λv"),
            mcq("To find eigenvalues, solve:", ["det(A) = λ", "det(A − λI) = 0", "A − λ = 0", "trace(A) = λ"], "det(A − λI) = 0"),
        ],
        "PA": [
            msq("What are the eigenvalues of [[2, 1], [0, 3]]?", ["1", "2", "3", "5"], ["2", "3"]),
            mcq("P⁻¹AP represents A:", ["inverted", "in the basis given by P's columns", "transposed", "squared"], "in the basis given by P's columns"),
            num("The eigenvalues of [[4, 1], [2, 3]] are 2 and 5. What is the trace of the matrix?", "7"),
        ],
        "GA": [
            num("Product of the eigenvalues of [[4, 1], [2, 3]]?", "10"),
            mcq("A 2-D rotation by 90° has how many real eigenvectors (up to scaling)?", ["0", "1", "2", "infinitely many"], "0"),
            msq("If A = PDP⁻¹ with D diagonal, which are true?", ["Aᵏ = PDᵏP⁻¹", "The columns of P are eigenvectors of A", "The diagonal of D holds the eigenvalues", "A must be symmetric"], ["Aᵏ = PDᵏP⁻¹", "The columns of P are eigenvectors of A", "The diagonal of D holds the eigenvalues"]),
            num("[[2, 0], [0, 3]] raised to the 3rd power has what bottom-right entry?", "27"),
            mcq("Every vector is an eigenvector of:", ["any rotation", "a scalar multiple of the identity", "a shear", "any symmetric matrix"], "a scalar multiple of the identity"),
        ],
    },
}

CODING = {
    2: {
        "PPA": [code(
            "Read two 2×2 matrices, one per line, as 4 integers in row order (a b c d means [[a, b], [c, d]]). Print their product as 4 space-separated integers in row order.",
            [("1 2 3 4\n5 6 7 8", "19 22 43 50"), ("1 0 0 1\n9 8 7 6", "9 8 7 6")],
            [("0 -1 1 0\n0 -1 1 0", "-1 0 0 -1"), ("2 0 0 2\n1 2 3 4", "2 4 6 8"), ("1 1 0 1\n1 0 1 1", "2 1 1 1")])],
    },
    3: {
        "PPA": [code(
            "Read a 3×3 matrix as 3 lines of 3 integers. Print its determinant.",
            [("1 0 0\n0 1 0\n0 0 1", "1"), ("2 0 0\n0 3 0\n0 0 4", "24")],
            [("1 2 3\n4 5 6\n7 8 9", "0"), ("6 1 1\n4 -2 5\n2 8 7", "-306"), ("0 1 0\n1 0 0\n0 0 1", "-1")])],
    },
    4: {
        "PPA": [code(
            "Read two 3-D vectors (one per line, 3 integers each). Print their dot product on the first line and the cross product (3 space-separated integers) on the second.",
            [("1 2 3\n4 5 6", "32\n-3 6 -3"), ("1 0 0\n0 1 0", "0\n0 0 1")],
            [("2 2 2\n2 2 2", "12\n0 0 0"), ("0 0 1\n1 0 0", "0\n0 1 0"), ("3 -1 2\n1 4 -2", "-5\n-6 8 13")])],
    },
}
