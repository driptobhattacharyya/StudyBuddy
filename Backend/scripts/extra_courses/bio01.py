"""BIO01 - Foundations of Cell Biology.

Lectures are from Crash Course Biology (Complexly / PBS Digital Studios).
The original 2012 series is used for weeks 1-4; week 5 draws on the 2023 series.
"""
from scripts.extra_courses.helpers import lecture, mcq, msq, num, note

CC2012 = {"label": "Crash Course Biology (2012) playlist", "url": "https://www.youtube.com/playlist?list=PL3EED4C1D684D3ADF"}
SRC = "Crash Course"

COURSE = {
    "course_id": "BIO01",
    "course_name": "Foundations of Cell Biology",
    "description": "From carbon atoms to whole populations: what cells are made of, how they get energy, how they copy themselves, and how all of that drives evolution.",
    "instructor": "Course team, with lectures from Crash Course",
    "level": "Beginner",
    "total_weeks": 5,
    "color": "#15803d",
}

WEEK_TITLES = {
    1: "The chemistry of life",
    2: "Cells and membranes",
    3: "Energy in cells",
    4: "DNA and cell division",
    5: "Heredity and evolution",
}

LECTURES = [
    lecture(1, 1, "Carbon... so simple", "QnQe0xW_JY4", SRC,
            "Why is life built on carbon? A tour of covalent bonds and the reason carbon can form the long, branching skeletons that every biological molecule needs.",
            """- Carbon has four valence electrons, so it forms four covalent bonds.
- It can make chains, rings and branches, giving huge structural variety.
- Covalent bonds share electrons; ionic bonds transfer them.
- Most of a living thing by mass is just C, H, O and N.""", [CC2012]),
    lecture(1, 2, "Water: liquid awesome", "HVT3Y3_gHGg", SRC,
            "Hydrogen bonding gives water a list of odd properties (cohesion, adhesion, high heat capacity, ice that floats) and life depends on every one of them.",
            """- Water is polar: the O end is slightly negative, the H ends slightly positive.
- Hydrogen bonds between molecules cause cohesion and surface tension.
- Adhesion plus cohesion drive capillary action in plants.
- Ice is less dense than liquid water, so lakes freeze from the top down.
- High specific heat stabilises temperatures in organisms and oceans.""", [CC2012]),
    lecture(2, 1, "Eukaryopolis: the city of animal cells", "cj8dDTHGJBY", SRC,
            "The animal cell pictured as a city, with a nucleus for city hall, ribosomes as factories, and the Golgi as the post office. A memorable way to learn the organelles.",
            """- Nucleus: holds DNA, controls the cell.
- Ribosomes: build proteins. Rough ER: ribosome-studded, folds proteins.
- Golgi apparatus: modifies, packages and ships proteins.
- Mitochondria: make ATP.
- Lysosomes: break down waste.""", [CC2012]),
    lecture(2, 2, "Plant cells", "9UvlqAVCoqY", SRC,
            "What plant cells have that animal cells don't: a cell wall, chloroplasts and a large central vacuole, and why those features matter for a life rooted in one spot.",
            """- Cell wall of cellulose gives rigidity.
- Chloroplasts carry out photosynthesis.
- The central vacuole stores water and keeps the cell turgid.
- Plants still have mitochondria; they respire too.""", [CC2012]),
    lecture(2, 3, "Membranes and transport", "dPKvHrD1eS4", SRC,
            "How cells control what gets in and out: diffusion, osmosis, channel proteins, pumps, and the bulk movement of endocytosis and exocytosis.",
            """- Phospholipid bilayer: hydrophilic heads out, hydrophobic tails in.
- Passive transport (diffusion, osmosis) needs no energy and follows a gradient.
- Active transport (like the sodium-potassium pump) uses ATP to go against a gradient.
- Hypertonic, hypotonic and isotonic always describe one solution *relative to* another.""", [CC2012]),
    lecture(3, 1, "ATP and respiration", "00jbG_cfGuQ", SRC,
            "Following a glucose molecule through glycolysis, the Krebs cycle and the electron transport chain, and counting how much ATP comes out.",
            """- ATP stores energy in its phosphate bonds; ADP + Pᵢ → ATP needs energy.
- Glycolysis (cytoplasm): glucose → 2 pyruvate, net 2 ATP.
- Krebs cycle (mitochondrial matrix): makes NADH and FADH₂.
- Electron transport chain (inner membrane): makes most of the ATP, about 34.
- Without oxygen, cells fall back on fermentation.""", [CC2012]),
    lecture(4, 1, "DNA structure and replication", "8kK2zwjRV0M", SRC,
            "The double helix, base pairing, and the team of enzymes that copy six billion base pairs every time a cell divides.",
            """- Nucleotide = sugar + phosphate + base (A, T, G, C).
- A pairs with T; G pairs with C.
- Strands are antiparallel (5′→3′ and 3′→5′).
- Helicase unzips; DNA polymerase adds nucleotides in the 5′→3′ direction.
- Leading strand is continuous; lagging strand is built in Okazaki fragments.
- Replication is semi-conservative.""", [CC2012]),
    lecture(4, 2, "Mitosis: splitting up is complicated", "L0k-enzoeOM", SRC,
            "How one cell becomes two identical cells: interphase, then prophase, metaphase, anaphase and telophase, then cytokinesis.",
            """- Interphase: the cell grows and copies its DNA (S phase).
- Prophase: chromosomes condense; spindle forms.
- Metaphase: chromosomes line up in the middle.
- Anaphase: sister chromatids are pulled apart.
- Telophase and cytokinesis: two nuclei, then two cells.""", [CC2012]),
    lecture(4, 3, "Meiosis: where the sex starts", "qCLmR9-YY7o", SRC,
            "The special division that makes sperm and egg cells: two rounds of division, half the chromosomes, and plenty of shuffling along the way.",
            """- Meiosis I separates homologous chromosomes; meiosis II separates sister chromatids.
- Result: four haploid cells, each genetically different.
- Crossing over in prophase I swaps segments between homologues.
- Independent assortment in metaphase I shuffles which homologue goes where.""", [CC2012]),
    lecture(5, 1, "Meiosis: why are all humans unique?", "pj1oFx42d48", SRC,
            "A newer take on meiosis focused on variation, and the reason siblings with the same parents can be so different.",
            """- 2²³ ≈ 8.4 million combinations from independent assortment alone.
- Crossing over adds far more.
- Random fertilisation multiplies the possibilities again.""", []),
    lecture(5, 2, "Microevolution: what's an allele got to do with it?", "fBOrzQP423A", SRC,
            "Evolution at the scale of a population: how natural selection, gene flow and genetic drift change allele frequencies over generations.",
            """- Evolution = change in allele frequencies in a population over time.
- Natural selection: alleles that improve survival and reproduction spread.
- Genetic drift: random change, strongest in small populations.
- Gene flow: alleles move between populations.
- Mutation is the ultimate source of new alleles.""", []),
    lecture(5, 3, "Evolutionary history: the timeline of life", "4mxJbgdiyIY", SRC,
            "A fast tour of four billion years, from the first cells to the present, and how we know what happened when.",
            """- First life about 3.5–4 billion years ago; prokaryotes dominate for most of history.
- Oxygen from photosynthesis transforms the atmosphere.
- Eukaryotes, then multicellular life, then the Cambrian explosion.
- Mass extinctions reset the playing field several times.""", []),
]

PENDING_LECTURES = [
    lecture(1, 3, "Biological molecules: you are what you eat", "H8WJ2KENlK0", SRC,
            "Carbohydrates, lipids and proteins: the building blocks of life.", "- Monomers join by dehydration synthesis and split by hydrolysis.", [CC2012]),
    lecture(3, 2, "Photosynthesis", "sQK3Yr4Sc_k", SRC,
            "Light reactions and the Calvin cycle.", "- 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂.", [CC2012]),
    lecture(5, 4, "Heredity", "CBezq1fFUEA", SRC,
            "Mendel, Punnett squares, and dominant and recessive alleles.", "- A 3:1 phenotype ratio from a monohybrid cross.", [CC2012]),
    lecture(5, 5, "Natural selection", "aTftyFboC_M", SRC,
            "Darwin's big idea and the evidence for it.", "- Variation, inheritance, selection, time.", [CC2012]),
]

NOTES = [
    note(1, "Week 1 reading: why water and carbon?", """
<h3>Carbon is the scaffold</h3>
<p>Silicon also forms four bonds, but silicon-silicon bonds are weak and silicon dioxide is a solid (sand). Carbon dioxide is a gas that dissolves in water, which makes carbon easy to cycle through living things.</p>
<h3>The four big molecule families</h3>
<table>
<tr><th>Family</th><th>Building block</th><th>Main job</th></tr>
<tr><td>Carbohydrates</td><td>Monosaccharides (e.g. glucose)</td><td>Quick energy, structure (cellulose)</td></tr>
<tr><td>Lipids</td><td>Fatty acids and glycerol</td><td>Long-term energy, membranes</td></tr>
<tr><td>Proteins</td><td>Amino acids (20 kinds)</td><td>Enzymes, structure, signalling</td></tr>
<tr><td>Nucleic acids</td><td>Nucleotides</td><td>Storing and using genetic information</td></tr>
</table>
<h3>Water's properties, and why they matter</h3>
<ul><li><b>Cohesion</b>: water travels up tall trees.</li>
<li><b>High specific heat</b>: coastal climates are mild and your body temperature stays stable.</li>
<li><b>Ice floats</b>: fish survive winter under the ice.</li>
<li><b>Good solvent</b>: chemistry in cells happens in water.</li></ul>
"""),
    note(2, "Week 2 reading: inside the cell", """
<h3>Prokaryotes vs eukaryotes</h3>
<p>Prokaryotes (bacteria and archaea) have no nucleus and no membrane-bound organelles. Eukaryotes (plants, animals, fungi, protists) do. Mitochondria and chloroplasts have their own DNA and double membranes, strong evidence that they were once free-living bacteria (endosymbiotic theory).</p>
<h3>Plant vs animal cells at a glance</h3>
<table>
<tr><th>Feature</th><th>Plant</th><th>Animal</th></tr>
<tr><td>Cell wall</td><td>Yes</td><td>No</td></tr>
<tr><td>Chloroplasts</td><td>Yes</td><td>No</td></tr>
<tr><td>Large central vacuole</td><td>Yes</td><td>No (small vacuoles)</td></tr>
<tr><td>Mitochondria</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Centrioles</td><td>Usually no</td><td>Yes</td></tr>
</table>
<h3>Osmosis in one sentence</h3>
<p>Water moves toward the side with more dissolved stuff. Put a red blood cell in pure water and it swells and bursts; put it in salty water and it shrivels.</p>
"""),
    note(3, "Week 3 reading: following the energy", """
<h3>The big picture</h3>
<p>Photosynthesis stores the sun's energy in glucose. Cellular respiration releases it as ATP. The two equations are mirror images:</p>
<pre>Photosynthesis: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂
Respiration:    C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ~38 ATP</pre>
<h3>Where each stage happens</h3>
<ul><li>Glycolysis: cytoplasm, no oxygen needed, 2 ATP.</li>
<li>Krebs cycle: mitochondrial matrix.</li>
<li>Electron transport chain: inner mitochondrial membrane, where most ATP is made.</li></ul>
<h3>When oxygen runs out</h3>
<p>Muscle cells switch to lactic acid fermentation and yeast to alcoholic fermentation. Both regenerate NAD⁺ so glycolysis can keep going, at only 2 ATP per glucose.</p>
"""),
    note(4, "Week 4 reading: copying and dividing", """
<h3>Mitosis vs meiosis</h3>
<table>
<tr><th></th><th>Mitosis</th><th>Meiosis</th></tr>
<tr><td>Purpose</td><td>Growth, repair</td><td>Making gametes</td></tr>
<tr><td>Divisions</td><td>1</td><td>2</td></tr>
<tr><td>Daughter cells</td><td>2, diploid</td><td>4, haploid</td></tr>
<tr><td>Genetically identical?</td><td>Yes</td><td>No</td></tr>
<tr><td>Crossing over?</td><td>No</td><td>Yes (prophase I)</td></tr>
</table>
<h3>Remembering the phases</h3>
<p><b>P</b>lease <b>M</b>ake <b>A</b>nother <b>T</b>ea: prophase, metaphase, anaphase, telophase.</p>
<h3>When division goes wrong</h3>
<p>If chromosomes fail to separate (nondisjunction) during meiosis, a gamete ends up with an extra or missing chromosome. Trisomy 21 (Down syndrome) is the best-known example.</p>
"""),
    note(5, "Week 5 reading: populations change", """
<h3>Mendel in five minutes</h3>
<p>Each organism carries two alleles per gene, one from each parent. A cross of Aa × Aa gives AA : Aa : aa in a 1 : 2 : 1 ratio, so with A dominant you see a 3 : 1 phenotype ratio.</p>
<h3>Hardy-Weinberg as a baseline</h3>
<p>In a large, randomly mating population with no selection, mutation or migration, allele frequencies stay constant: p² + 2pq + q² = 1. Real populations break these assumptions, and measuring <i>how</i> they break tells you which evolutionary force is at work.</p>
<h3>Worked example</h3>
<p>If 16% of a population shows a recessive trait, q² = 0.16, so q = 0.4 and p = 0.6. Carriers make up 2pq = 0.48, or 48%.</p>
"""),
]

QUESTIONS = {
    1: {
        "AQ": [
            num("How many covalent bonds does a carbon atom typically form?", "4"),
            mcq("Water molecules stick to each other mainly because of:", ["ionic bonds", "hydrogen bonds", "peptide bonds", "metallic bonds"], "hydrogen bonds"),
        ],
        "PA": [
            mcq("Ice floats because:", ["it contains air", "it is less dense than liquid water", "it is more polar", "it has fewer hydrogen bonds"], "it is less dense than liquid water"),
            msq("Which elements make up most of a living thing's mass?", ["Carbon", "Hydrogen", "Oxygen", "Iron"], ["Carbon", "Hydrogen", "Oxygen"]),
            mcq("Proteins are polymers of:", ["nucleotides", "amino acids", "fatty acids", "monosaccharides"], "amino acids"),
        ],
        "GA": [
            mcq("Water climbing up a narrow tube is called:", ["osmosis", "capillary action", "transpiration", "diffusion"], "capillary action"),
            msq("Which are properties of water caused by hydrogen bonding?", ["High surface tension", "High specific heat", "Ice floats", "It is a gas at room temperature"], ["High surface tension", "High specific heat", "Ice floats"]),
            num("How many different amino acids are commonly used to build proteins?", "20"),
            mcq("Cellulose, the main component of plant cell walls, is a:", ["lipid", "protein", "carbohydrate", "nucleic acid"], "carbohydrate"),
            mcq("A water molecule is polar because:", ["oxygen pulls shared electrons more strongly than hydrogen", "it is ionic", "it has a net positive charge", "it contains carbon"], "oxygen pulls shared electrons more strongly than hydrogen"),
        ],
    },
    2: {
        "AQ": [
            mcq("Which organelle makes most of the cell's ATP?", ["nucleus", "mitochondrion", "Golgi apparatus", "lysosome"], "mitochondrion"),
            mcq("Proteins are built by:", ["ribosomes", "lysosomes", "vacuoles", "centrioles"], "ribosomes"),
        ],
        "PA": [
            msq("Which structures are found in plant cells but not animal cells?", ["Cell wall", "Chloroplast", "Large central vacuole", "Mitochondrion"], ["Cell wall", "Chloroplast", "Large central vacuole"]),
            mcq("A red blood cell placed in pure water will:", ["shrink", "swell and possibly burst", "stay the same", "divide"], "swell and possibly burst"),
            mcq("The sodium-potassium pump is an example of:", ["simple diffusion", "osmosis", "active transport", "facilitated diffusion"], "active transport"),
        ],
        "GA": [
            mcq("The cell's packaging and shipping centre is the:", ["rough ER", "Golgi apparatus", "nucleus", "mitochondrion"], "Golgi apparatus"),
            msq("Which kinds of transport need no energy from the cell?", ["Simple diffusion", "Osmosis", "Facilitated diffusion", "Sodium-potassium pump"], ["Simple diffusion", "Osmosis", "Facilitated diffusion"]),
            mcq("Phospholipid tails are:", ["hydrophilic", "hydrophobic", "charged", "made of amino acids"], "hydrophobic"),
            msq("Evidence that mitochondria were once free-living bacteria includes:", ["They have their own DNA", "They have a double membrane", "They divide independently of the cell", "They contain chlorophyll"], ["They have their own DNA", "They have a double membrane", "They divide independently of the cell"]),
            mcq("A cell in a hypertonic solution will:", ["gain water", "lose water", "burst", "not change"], "lose water"),
        ],
    },
    3: {
        "AQ": [
            mcq("ATP stands for:", ["adenosine triphosphate", "amino tri-protein", "adenine thymine phosphate", "active transport protein"], "adenosine triphosphate"),
            mcq("Glycolysis takes place in the:", ["mitochondrial matrix", "cytoplasm", "nucleus", "chloroplast"], "cytoplasm"),
        ],
        "PA": [
            num("Net ATP produced by glycolysis per glucose molecule?", "2"),
            mcq("Most ATP in aerobic respiration is made by:", ["glycolysis", "the Krebs cycle", "the electron transport chain", "fermentation"], "the electron transport chain"),
            msq("Which are products of photosynthesis?", ["Glucose", "Oxygen", "Carbon dioxide", "Water"], ["Glucose", "Oxygen"]),
        ],
        "GA": [
            num("How many pyruvate molecules does glycolysis produce from one glucose?", "2"),
            mcq("The final electron acceptor in the electron transport chain is:", ["NAD⁺", "oxygen", "glucose", "carbon dioxide"], "oxygen"),
            mcq("Fermentation lets glycolysis continue by regenerating:", ["ATP", "NAD⁺", "oxygen", "glucose"], "NAD⁺"),
            msq("Which happen inside mitochondria?", ["Krebs cycle", "Electron transport chain", "Glycolysis", "Calvin cycle"], ["Krebs cycle", "Electron transport chain"]),
            num("In the balanced respiration equation C₆H₁₂O₆ + xO₂ → 6CO₂ + 6H₂O, what is x?", "6"),
        ],
    },
    4: {
        "AQ": [
            mcq("In DNA, adenine pairs with:", ["cytosine", "guanine", "thymine", "uracil"], "thymine"),
            mcq("Mitosis produces:", ["4 haploid cells", "2 identical diploid cells", "2 haploid cells", "4 diploid cells"], "2 identical diploid cells"),
        ],
        "PA": [
            mcq("During which phase do chromosomes line up at the cell's equator?", ["prophase", "metaphase", "anaphase", "telophase"], "metaphase"),
            num("If one strand of DNA is 30% adenine, what percentage of the double-stranded molecule is thymine?", "30"),
            msq("Which enzymes are involved in DNA replication?", ["Helicase", "DNA polymerase", "Ligase", "Amylase"], ["Helicase", "DNA polymerase", "Ligase"]),
        ],
        "GA": [
            mcq("DNA replication is described as:", ["conservative", "semi-conservative", "dispersive", "random"], "semi-conservative"),
            num("A human body cell has 46 chromosomes. How many does a human egg cell have?", "23"),
            mcq("Crossing over happens during:", ["prophase I of meiosis", "anaphase of mitosis", "telophase II of meiosis", "interphase"], "prophase I of meiosis"),
            msq("Which are true about meiosis?", ["It has two divisions", "It produces genetically identical cells", "It produces haploid cells", "It happens in gamete production"], ["It has two divisions", "It produces haploid cells", "It happens in gamete production"]),
            mcq("Okazaki fragments are found on the:", ["leading strand", "lagging strand", "mRNA", "both strands equally"], "lagging strand"),
        ],
    },
    5: {
        "AQ": [
            mcq("Evolution, at its simplest, is a change in:", ["an individual's DNA during its life", "allele frequencies in a population over time", "the number of species", "body size"], "allele frequencies in a population over time"),
            num("With independent assortment alone, roughly how many million chromosome combinations can a human gamete have? (2²³, rounded to the nearest million)", "8"),
        ],
        "PA": [
            mcq("Random change in allele frequencies, strongest in small populations, is:", ["natural selection", "genetic drift", "gene flow", "mutation"], "genetic drift"),
            num("Cross Aa × Aa. What fraction of offspring are aa? Give a decimal.", "0.25"),
            msq("Which can change allele frequencies in a population?", ["Natural selection", "Genetic drift", "Gene flow", "Random mating in a huge population with nothing else acting"], ["Natural selection", "Genetic drift", "Gene flow"]),
        ],
        "GA": [
            num("If 16% of a population shows a recessive trait (q² = 0.16), what is q?", "0.4"),
            num("Using the same population (q = 0.4), what percentage are heterozygous carriers (2pq × 100)?", "48"),
            mcq("The ultimate source of new alleles is:", ["natural selection", "mutation", "genetic drift", "gene flow"], "mutation"),
            mcq("An Aa × Aa cross with A dominant gives a phenotype ratio of:", ["1:1", "1:2:1", "3:1", "9:3:3:1"], "3:1"),
            msq("Which are assumptions of Hardy-Weinberg equilibrium?", ["Very large population", "Random mating", "No natural selection", "High mutation rate"], ["Very large population", "Random mating", "No natural selection"]),
        ],
    },
}

CODING = {}
