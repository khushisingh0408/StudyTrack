const mongoose = require("mongoose");
const Subject = require("../models/Subject");
const Topic = require("../models/Topic");
const SubTopic = require("../models/SubTopic");
const StudySession = require("../models/StudySession");
const Task = require("../models/Task");
const User = require("../models/User");
const { readDB, writeDB, generateId } = require("../config/localStore");

// Multi-domain realistic syllabus packages
const TEMPLATES = {
  medical: {
    id: "medical",
    name: "Medical & Healthcare (MBBS / NEET-PG / USMLE)",
    icon: "Stethoscope",
    description: "Complete pre-clinical and clinical curriculum including Anatomy, Physiology, Biochemistry, Pharmacology, Pathology, and Medicine.",
    targetExamDefault: "NEET PG / USMLE Step 1",
    targetExamDays: 120,
    subjects: [
      {
        name: "Human Anatomy",
        color: "#f43f5e",
        icon: "Heart",
        targetHours: 60,
        description: "Gross Anatomy, Embryology, Neuroanatomy, and Histology",
        topics: [
          {
            title: "Upper & Lower Limb Anatomy",
            subTopics: [
              { title: "Brachial Plexus & Nerve Injuries", estimatedMinutes: 45, notes: "Erb's Duchenne (C5-C6), Klumpke's (C8-T1)" },
              { title: "Shoulder Joint & Rotator Cuff", estimatedMinutes: 40, notes: "SITS muscles: Supraspinatus, Infraspinatus, Teres minor, Subscapularis" },
              { title: "Femoral Triangle & Femoral Canal", estimatedMinutes: 35, notes: "NAVEL: Nerve, Artery, Vein, Empty space, Lymphatics" },
            ],
          },
          {
            title: "Neuroanatomy & CNS",
            subTopics: [
              { title: "Circle of Willis & Cerebral Circulation", estimatedMinutes: 50, notes: "Anterior & Posterior communicating arteries" },
              { title: "Cranial Nerves (I to XII) Examination", estimatedMinutes: 60, notes: "Sensory, Motor, and Parasympathetic pathways" },
              { title: "Brainstem Syndromes (Weber, Wallenberg)", estimatedMinutes: 45, notes: "Lateral medullary syndrome: PICA occlusion" },
            ],
          },
          {
            title: "Thorax & Cardiovascular System",
            subTopics: [
              { title: "Coronary Arteries & Cardiac Blood Supply", estimatedMinutes: 40, notes: "LAD: Widow maker artery" },
              { title: "Bronchopulmonary Segments", estimatedMinutes: 35, notes: "10 segments in right lung, 8-10 in left lung" },
            ],
          },
        ],
      },
      {
        name: "Medical Physiology",
        color: "#ec4899",
        icon: "Activity",
        targetHours: 50,
        description: "Cardiovascular, Respiratory, Renal, and Endocrine mechanisms",
        topics: [
          {
            title: "Cardiovascular Physiology",
            subTopics: [
              { title: "Cardiac Cycle & Wiggers Diagram", estimatedMinutes: 45, notes: "Isovolumetric contraction, ejection, ventricular filling" },
              { title: "ECG Interpretation & Axis Deviation", estimatedMinutes: 50, notes: "P wave: Atrial depol, QRS: Ventricular depol, T: Ventricular repol" },
              { title: "Blood Pressure Regulation & RAAS System", estimatedMinutes: 40, notes: "Renin -> Angiotensin I -> ACE -> Angiotensin II -> Aldosterone" },
            ],
          },
          {
            title: "Renal Physiology & Acid-Base",
            subTopics: [
              { title: "Glomerular Filtration Rate (GFR) & Clearance", estimatedMinutes: 40, notes: "Inulin clearance = GFR gold standard" },
              { title: "Countercurrent Multiplier Mechanism", estimatedMinutes: 45, notes: "Loop of Henle osmolarity gradient (300 to 1200 mOsm/L)" },
              { title: "Arterial Blood Gas (ABG) & Acid-Base Disorders", estimatedMinutes: 50, notes: "Metabolic acidosis with High Anion Gap (MUDPILES)" },
            ],
          },
        ],
      },
      {
        name: "Pharmacology",
        color: "#8b5cf6",
        icon: "Pill",
        targetHours: 55,
        description: "Autonomic, Cardiovascular, Antimicrobial, and CNS Drugs",
        topics: [
          {
            title: "Autonomic Nervous System Drugs",
            subTopics: [
              { title: "Sympathomimetics & Adrenergic Blockers", estimatedMinutes: 45, notes: "Beta-1 (Heart), Beta-2 (Lungs/Vessels), Alpha-1 (Smooth muscle)" },
              { title: "Cholinergic Agonists & Anticholinergics", estimatedMinutes: 40, notes: "Atropine toxicity: Blind as a bat, mad as a hatter, red as a beet" },
            ],
          },
          {
            title: "Antimicrobial Chemotherapy",
            subTopics: [
              { title: "Beta-Lactams & Cephalosporins Mechanisms", estimatedMinutes: 50, notes: "Inhibit transpeptidase / cell wall synthesis" },
              { title: "Fluoroquinolones & Aminoglycosides", estimatedMinutes: 45, notes: "DNA gyrase inhibitors & 30S ribosomal subunit binding" },
            ],
          },
        ],
      },
      {
        name: "Pathology & Microbiology",
        color: "#f59e0b",
        icon: "FlaskConical",
        targetHours: 65,
        description: "General Pathology, Hematology, Systemic Pathology & Infectious Agents",
        topics: [
          {
            title: "Cell Injury & Inflammation",
            subTopics: [
              { title: "Apoptosis vs Necrosis Pathways", estimatedMinutes: 40, notes: "Intrinsic (mitochondrial/cytochrome c) vs Extrinsic (Fas/FasL)" },
              { title: "Acute vs Chronic Inflammation Mediators", estimatedMinutes: 45, notes: "Histamine, Prostaglandins, Leukotrienes, TNF-alpha, IL-1" },
            ],
          },
          {
            title: "Hematology & Coagulation Disorders",
            subTopics: [
              { title: "Anemias: Microcytic, Normocytic, Macrocytic", estimatedMinutes: 50, notes: "Iron deficiency vs Thalassemia vs B12/Folate deficiency" },
              { title: "Coagulation Cascade & Thrombosis", estimatedMinutes: 45, notes: "Intrinsic (PTT) vs Extrinsic (PT/INR) pathways" },
            ],
          },
        ],
      },
    ],
  },

  engineering: {
    id: "engineering",
    name: "Computer Science & Engineering (B.Tech / GATE / Tech Interviews)",
    icon: "Code",
    description: "Core CS curriculum covering Data Structures, Algorithms, OS, Networks, DBMS, and System Design.",
    targetExamDefault: "GATE CS / Tech Placement",
    targetExamDays: 90,
    subjects: [
      {
        name: "Data Structures & Algorithms",
        color: "#6366f1",
        icon: "Code2",
        targetHours: 70,
        description: "Arrays, Trees, Graphs, Dynamic Programming & Graph Algorithms",
        topics: [
          {
            title: "Trees & Binary Search Trees",
            subTopics: [
              { title: "Binary Tree Traversals (In/Pre/Post/Level Order)", estimatedMinutes: 40, notes: "BFS queue vs DFS recursion stack" },
              { title: "Lowest Common Ancestor (LCA) in BST & BT", estimatedMinutes: 45, notes: "O(H) for BST using value comparison" },
              { title: "Segment Trees & Fenwick Tree (Binary Indexed Tree)", estimatedMinutes: 60, notes: "Range query in O(log N) and point update in O(log N)" },
            ],
          },
          {
            title: "Graph Algorithms",
            subTopics: [
              { title: "Dijkstra's Shortest Path & Bellman-Ford", estimatedMinutes: 50, notes: "Priority queue implementation O((V+E) log V)" },
              { title: "Minimum Spanning Tree (Kruskal & Prim)", estimatedMinutes: 45, notes: "Disjoint Set Union (DSU) with path compression" },
              { title: "Topological Sort & Cycle Detection in DAG", estimatedMinutes: 40, notes: "Kahn's Algorithm using in-degree array" },
            ],
          },
          {
            title: "Dynamic Programming",
            subTopics: [
              { title: "0/1 Knapsack & Unbounded Knapsack", estimatedMinutes: 50, notes: "State: dp[i][w] = max profit with weight capacity w" },
              { title: "Longest Common Subsequence (LCS) & Variants", estimatedMinutes: 45, notes: "Edit distance, Shortest Common Supersequence" },
            ],
          },
        ],
      },
      {
        name: "Computer Networks",
        color: "#3b82f6",
        icon: "Network",
        targetHours: 45,
        description: "OSI 7 Layers, TCP/IP, Routing Protocols, DNS, HTTP, Security",
        topics: [
          {
            title: "Transport Layer & Flow Control",
            subTopics: [
              { title: "TCP 3-Way Handshake & Connection Teardown", estimatedMinutes: 40, notes: "SYN, SYN-ACK, ACK and FIN/ACK" },
              { title: "TCP Congestion Control (Slow Start, AIMD)", estimatedMinutes: 45, notes: "Congestion window (cwnd), threshold (ssthresh)" },
              { title: "Sliding Window Protocols (Go-Back-N & Selective Repeat)", estimatedMinutes: 45, notes: "Efficiency = N / (1 + 2a)" },
            ],
          },
          {
            title: "Network Layer & Routing",
            subTopics: [
              { title: "IP Subnetting & CIDR Calculation", estimatedMinutes: 35, notes: "VLSM, Broadcast & Network IDs" },
              { title: "Routing Protocols (OSPF, BGP, Distance Vector)", estimatedMinutes: 45, notes: "Link State vs Path Vector vs Distance Vector (Count to Infinity)" },
            ],
          },
        ],
      },
      {
        name: "Operating Systems",
        color: "#06b6d4",
        icon: "Cpu",
        targetHours: 40,
        description: "Processes, Threads, CPU Scheduling, Synchronization, Memory Management",
        topics: [
          {
            title: "Process Synchronization & Concurrency",
            subTopics: [
              { title: "Critical Section, Mutex & Semaphores", estimatedMinutes: 45, notes: "Counting vs Binary Semaphores (wait/signal)" },
              { title: "Classic IPC Problems (Dining Philosophers, Producer-Consumer)", estimatedMinutes: 50, notes: "Deadlock prevention and bounded buffer handling" },
              { title: "Banker's Algorithm for Deadlock Avoidance", estimatedMinutes: 40, notes: "Need matrix = Max - Allocation <= Available" },
            ],
          },
          {
            title: "Virtual Memory Management",
            subTopics: [
              { title: "Paging, TLB & Page Table Structure", estimatedMinutes: 45, notes: "Effective Access Time (EAT) = hit_rate * (TLB + Mem) + miss_rate * (TLB + 2*Mem)" },
              { title: "Page Replacement Algorithms (LRU, FIFO, Optimal)", estimatedMinutes: 40, notes: "Belady's Anomaly in FIFO" },
            ],
          },
        ],
      },
      {
        name: "Database Management Systems (DBMS)",
        color: "#10b981",
        icon: "Database",
        targetHours: 40,
        description: "SQL, Relational Algebra, Normalization, ACID Transactions, Indexing",
        topics: [
          {
            title: "Transactions & Concurrency Control",
            subTopics: [
              { title: "ACID Properties & Transaction States", estimatedMinutes: 35, notes: "Atomicity, Consistency, Isolation, Durability" },
              { title: "Conflict Serializability & Precedence Graph", estimatedMinutes: 45, notes: "Check for cycles in precedence graph for conflict serializability" },
              { title: "Two-Phase Locking (2PL) & Strict 2PL", estimatedMinutes: 40, notes: "Growing phase vs Shrinking phase (avoids cascading rollback in strict 2PL)" },
            ],
          },
          {
            title: "Database Normalization",
            subTopics: [
              { title: "1NF, 2NF, 3NF & BCNF Decomposition", estimatedMinutes: 50, notes: "Lossless join & Dependency preservation conditions" },
              { title: "B-Trees & B+ Trees Indexing", estimatedMinutes: 45, notes: "Height O(log_B N) with all data records in leaf nodes in B+ Tree" },
            ],
          },
        ],
      },
    ],
  },

  competitive: {
    id: "competitive",
    name: "Civil Services & Govt Exams (UPSC CSE / State PSC / SSC CGL)",
    icon: "Landmark",
    description: "Comprehensive General Studies (GS 1, 2, 3, 4) & CSAT for Civil Services and Government Exams.",
    targetExamDefault: "UPSC CSE Prelims",
    targetExamDays: 140,
    subjects: [
      {
        name: "Indian Polity & Constitution (GS-2)",
        color: "#f59e0b",
        icon: "Scale",
        targetHours: 65,
        description: "Fundamental Rights, DPSP, Parliament, Judiciary, Federalism",
        topics: [
          {
            title: "Constitutional Framework & Rights",
            subTopics: [
              { title: "Preamble, Basic Structure Doctrine (Kesavananda Bharati)", estimatedMinutes: 45, notes: "1973 Landmark ruling defining unamendable core of Constitution" },
              { title: "Fundamental Rights (Articles 12 - 35) & Writs", estimatedMinutes: 60, notes: "Habeas Corpus, Mandamus, Quo-Warranto, Prohibition, Certiorari" },
              { title: "Directive Principles (Part IV) & Fundamental Duties (Part IVA)", estimatedMinutes: 40, notes: "Article 44 Uniform Civil Code, 42nd Amendment added 10 duties" },
            ],
          },
          {
            title: "Union Executive & Parliament",
            subTopics: [
              { title: "President & Governor Powers Comparison", estimatedMinutes: 50, notes: "Ordinance making (Art 123 vs 213), Pardoning powers (Art 72 vs 161)" },
              { title: "Parliamentary Committees (PAC, Estimates Committee)", estimatedMinutes: 40, notes: "Public Accounts Committee headed by Opposition member" },
              { title: "Supreme Court & Judicial Review (Collegium System)", estimatedMinutes: 50, notes: "Three Judges Cases & NJAC 99th Constitutional Amendment" },
            ],
          },
        ],
      },
      {
        name: "Modern Indian History & Culture (GS-1)",
        color: "#ec4899",
        icon: "BookOpen",
        targetHours: 55,
        description: "Freedom Struggle, Gandhian Era, Socio-Religious Reforms, Temple Architecture",
        topics: [
          {
            title: "Indian National Movement (1857 - 1947)",
            subTopics: [
              { title: "Revolt of 1857 Causes, Leaders & Failure", estimatedMinutes: 40, notes: "Lord Canning, Queen Victoria's Proclamation 1858" },
              { title: "Non-Cooperation & Civil Disobedience Movements", estimatedMinutes: 50, notes: "Chauri Chaura 1922, Dandi Salt March 1930" },
              { title: "Quit India Movement 1942 & Cabinet Mission Plan 1946", estimatedMinutes: 45, notes: "Do or Die slogan, Interim Government formation" },
            ],
          },
        ],
      },
      {
        name: "Indian Economy & Development (GS-3)",
        color: "#10b981",
        icon: "TrendingUp",
        targetHours: 60,
        description: "Macroeconomics, Budgeting, Inflation, Monetary Policy, Agriculture & Infrastructure",
        topics: [
          {
            title: "Monetary & Fiscal Policy",
            subTopics: [
              { title: "RBI Tools: Repo Rate, Reverse Repo, CRR, SLR", estimatedMinutes: 45, notes: "Monetary Policy Committee (MPC) 4% +/- 2% target" },
              { title: "Union Budget & Fiscal Deficit (FRBM Act)", estimatedMinutes: 50, notes: "Revenue Deficit vs Primary Deficit vs Effective Revenue Deficit" },
              { title: "Inflation Types (Headline vs Core) & CPI/WPI", estimatedMinutes: 40, notes: "CPI base year 2012 by NSO, WPI by DPIIT" },
            ],
          },
        ],
      },
      {
        name: "Geography, Environment & Ecology (GS-1 & 3)",
        color: "#06b6d4",
        icon: "Globe",
        targetHours: 50,
        description: "Physical Geography, Climate, Biodiversity, Ramsar Sites, National Parks",
        topics: [
          {
            title: "Environment & Climate Conventions",
            subTopics: [
              { title: "UNFCCC COP Summits & Paris Agreement Targets", estimatedMinutes: 45, notes: "NDCs, Net Zero 2070 commitment for India" },
              { title: "Wildlife Protection Act 1972 & Protected Areas", estimatedMinutes: 40, notes: "National Parks (No human activity) vs Wildlife Sanctuaries" },
            ],
          },
        ],
      },
    ],
  },

  science: {
    id: "science",
    name: "Science & Entrance Prep (JEE / NEET / 11th-12th Boards)",
    icon: "Atom",
    description: "Physics, Chemistry, and Mathematics/Biology curriculum for engineering and medical entrance tests.",
    targetExamDefault: "JEE Main / NEET 2026",
    targetExamDays: 75,
    subjects: [
      {
        name: "Physics",
        color: "#6366f1",
        icon: "Zap",
        targetHours: 60,
        description: "Mechanics, Electromagnetism, Optics, Modern Physics, Thermodynamics",
        topics: [
          {
            title: "Rotational Dynamics & Gravitation",
            subTopics: [
              { title: "Moment of Inertia & Parallel/Perpendicular Axis Theorems", estimatedMinutes: 45, notes: "I = I_cm + Md^2 for parallel axes" },
              { title: "Conservation of Angular Momentum & Rolling Motion", estimatedMinutes: 50, notes: "v = omega * R, Total KE = 1/2 mv^2 + 1/2 I omega^2" },
            ],
          },
          {
            title: "Electrodynamics & Optics",
            subTopics: [
              { title: "Gauss's Law & Electric Potential", estimatedMinutes: 45, notes: "Total flux = q_enclosed / epsilon_0" },
              { title: "Wave Optics & Young's Double Slit Experiment (YDSE)", estimatedMinutes: 45, notes: "Fringe width beta = lambda * D / d" },
            ],
          },
        ],
      },
      {
        name: "Chemistry",
        color: "#ec4899",
        icon: "FlaskRound",
        targetHours: 55,
        description: "Organic Mechanisms, Coordination Compounds, Thermodynamics, Chemical Bonding",
        topics: [
          {
            title: "Organic Chemistry Mechanisms",
            subTopics: [
              { title: "SN1 vs SN2 & E1 vs E2 Reaction Mechanisms", estimatedMinutes: 50, notes: "SN2: Inversion of configuration (Walden inversion), Polar aprotic solvents" },
              { title: "Aldehydes, Ketones & Carboxylic Acid Named Reactions", estimatedMinutes: 50, notes: "Aldol condensation, Cannizzaro reaction, Clemmensen reduction" },
            ],
          },
        ],
      },
      {
        name: "Mathematics / Biology",
        color: "#10b981",
        icon: "Calculator",
        targetHours: 60,
        description: "Differential & Integral Calculus, Vectors / Genetics, Human Physiology, Ecology",
        topics: [
          {
            title: "Integral Calculus & Vectors (Maths)",
            subTopics: [
              { title: "Integration by Parts & Definite Integral Properties", estimatedMinutes: 50, notes: "King's property: int_0^a f(x) dx = int_0^a f(a-x) dx" },
              { title: "3D Geometry & Shortest Distance Between Skew Lines", estimatedMinutes: 45, notes: "d = |(a2 - a1) . (b1 x b2)| / |b1 x b2|" },
            ],
          },
        ],
      },
    ],
  },

  commerce: {
    id: "commerce",
    name: "Commerce, CA & Business (CA / CS / CMA / MBA CAT)",
    icon: "Briefcase",
    description: "Financial Accounting, Corporate Law, Cost Management, Direct/Indirect Taxation, Quantitative Aptitude.",
    targetExamDefault: "CA Inter / CAT 2026",
    targetExamDays: 100,
    subjects: [
      {
        name: "Financial Reporting & Accounting",
        color: "#10b981",
        icon: "FileSpreadsheet",
        targetHours: 65,
        description: "Ind AS, Corporate Financial Statements, Consolidation & Cash Flows",
        topics: [
          {
            title: "Indian Accounting Standards (Ind AS)",
            subTopics: [
              { title: "Ind AS 115: Revenue from Contracts with Customers", estimatedMinutes: 50, notes: "5-Step model for revenue recognition" },
              { title: "Ind AS 116: Leases (Right-of-Use Asset & Lease Liability)", estimatedMinutes: 45, notes: "Operating lease capitalization on balance sheet" },
            ],
          },
        ],
      },
      {
        name: "Corporate & Economic Laws",
        color: "#f59e0b",
        icon: "ShieldAlert",
        targetHours: 50,
        description: "Companies Act 2013, Insolvency & Bankruptcy Code (IBC), SEBI Regulations",
        topics: [
          {
            title: "Companies Act 2013 Key Provisions",
            subTopics: [
              { title: "Board Meetings, Independent Directors & Quorum", estimatedMinutes: 45, notes: "Section 149 & 173 provisions" },
              { title: "Corporate Insolvency Resolution Process (CIRP under IBC 2016)", estimatedMinutes: 50, notes: "180 days timeline + 90 days extension" },
            ],
          },
        ],
      },
    ],
  },

  law: {
    id: "law",
    name: "Law & Judiciary (CLAT / LLB / Judiciary Exams)",
    icon: "Scale",
    description: "Constitutional Law, Criminal Law (BNS/IPC), Law of Torts & Contracts, Civil Procedure.",
    targetExamDefault: "Judiciary Prelims / CLAT PG",
    targetExamDays: 110,
    subjects: [
      {
        name: "Constitutional & Administrative Law",
        color: "#8b5cf6",
        icon: "Landmark",
        targetHours: 60,
        description: "Fundamental Rights, Judicial Review, Separation of Powers, Writs",
        topics: [
          {
            title: "Fundamental Rights & Constitutional Remedies",
            subTopics: [
              { title: "Article 21: Right to Life, Privacy (Puttaswamy case)", estimatedMinutes: 50, notes: "Golden triangle: Articles 14, 19, and 21" },
              { title: "Emergency Provisions (Articles 352, 356, 360)", estimatedMinutes: 45, notes: "S.R. Bommai case guidelines on President's Rule" },
            ],
          },
        ],
      },
      {
        name: "Criminal Jurisprudence (BNS / IPC)",
        color: "#f43f5e",
        icon: "Shield",
        targetHours: 55,
        description: "General Exceptions, Offences Against Human Body, Property & State",
        topics: [
          {
            title: "Culpable Homicide vs Murder",
            subTopics: [
              { title: "Distinction between Section 299 & 300 IPC (BNS equivalent)", estimatedMinutes: 50, notes: "Reg v. Govinda test for grave probability of death" },
              { title: "Right of Private Defence of Body & Property", estimatedMinutes: 40, notes: "Proportionality doctrine and reasonable apprehension" },
            ],
          },
        ],
      },
    ],
  },
};

// @route   GET /api/templates
// @desc    Get all available course templates
exports.getTemplates = async (req, res) => {
  try {
    const list = Object.values(TEMPLATES).map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      description: t.description,
      subjectCount: t.subjects.length,
      topicCount: t.subjects.reduce((acc, s) => acc + s.topics.length, 0),
      subTopicCount: t.subjects.reduce((acc, s) => acc + s.topics.reduce((a, tp) => a + tp.subTopics.length, 0), 0),
      targetExamDefault: t.targetExamDefault,
      targetExamDays: t.targetExamDays,
    }));
    res.json({ success: true, templates: list });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch templates", error: err.message });
  }
};

// @route   POST /api/templates/apply
// @desc    1-Click apply a template to user's account
exports.applyTemplate = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { templateId, replaceExisting = false } = req.body;

    const template = TEMPLATES[templateId];
    if (!template) {
      return res.status(404).json({ message: "Course template not found" });
    }

    // Set Target Exam date
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + (template.targetExamDays || 90));

    if (mongoose.connection.readyState === 1) {
      if (replaceExisting) {
        await Subject.deleteMany({ user: req.user._id });
        await Topic.deleteMany({ user: req.user._id });
        await SubTopic.deleteMany({ user: req.user._id });
      }

      await User.findByIdAndUpdate(req.user._id, {
        academicField: template.id,
        targetExam: template.targetExamDefault,
        targetExamDate: examDate,
      });

      for (const subjData of template.subjects) {
        const subject = await Subject.create({
          user: req.user._id,
          name: subjData.name,
          color: subjData.color,
          icon: subjData.icon,
          targetHours: subjData.targetHours,
          description: subjData.description,
        });

        for (const topicData of subjData.topics) {
          const topic = await Topic.create({
            user: req.user._id,
            subject: subject._id,
            title: topicData.title,
            description: "",
            status: "not_started",
          });

          for (const stData of topicData.subTopics) {
            await SubTopic.create({
              user: req.user._id,
              subject: subject._id,
              topic: topic._id,
              title: stData.title,
              estimatedMinutes: stData.estimatedMinutes,
              notes: stData.notes || "",
              status: "not_started",
            });
          }
        }
      }

      return res.json({
        success: true,
        message: `Successfully loaded '${template.name}' syllabus template!`,
        templateName: template.name,
      });
    }

    // Local Store Mode
    const db = readDB();

    if (replaceExisting) {
      db.subjects = db.subjects.filter((s) => (s.user || "").toString() !== userId);
      db.topics = db.topics.filter((t) => (t.user || "").toString() !== userId);
      db.subtopics = db.subtopics.filter((st) => (st.user || "").toString() !== userId);
    }

    const uIdx = db.users.findIndex((u) => u._id === userId || u.id === userId);
    if (uIdx !== -1) {
      db.users[uIdx].academicField = template.id;
      db.users[uIdx].targetExam = template.targetExamDefault;
      db.users[uIdx].targetExamDate = examDate.toISOString();
    }

    for (const subjData of template.subjects) {
      const sId = generateId();
      db.subjects.push({
        _id: sId,
        id: sId,
        user: userId,
        name: subjData.name,
        color: subjData.color,
        icon: subjData.icon,
        targetHours: subjData.targetHours,
        description: subjData.description,
        createdAt: new Date().toISOString(),
      });

      for (const topicData of subjData.topics) {
        const tId = generateId();
        db.topics.push({
          _id: tId,
          id: tId,
          user: userId,
          subject: sId,
          title: topicData.title,
          description: "",
          status: "not_started",
          createdAt: new Date().toISOString(),
        });

        for (const stData of topicData.subTopics) {
          const stId = generateId();
          db.subtopics.push({
            _id: stId,
            id: stId,
            user: userId,
            subject: sId,
            topic: tId,
            title: stData.title,
            estimatedMinutes: stData.estimatedMinutes,
            notes: stData.notes || "",
            status: "not_started",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    writeDB(db);

    res.json({
      success: true,
      message: `Successfully loaded '${template.name}' syllabus template!`,
      templateName: template.name,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to apply template", error: err.message });
  }
};

// @route   POST /api/templates/load-demo-data
// @desc    Pre-populates realistic study sessions, tasks, and historical streak for client demonstration
exports.loadDemoData = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const db = readDB();
    let subjects = db.subjects.filter((s) => (s.user || "").toString() === userId);

    // If user has no subjects, apply medical or engineering template first
    if (subjects.length === 0) {
      const template = TEMPLATES.engineering;
      for (const subjData of template.subjects) {
        const sId = generateId();
        db.subjects.push({
          _id: sId,
          id: sId,
          user: userId,
          name: subjData.name,
          color: subjData.color,
          icon: subjData.icon,
          targetHours: subjData.targetHours,
          description: subjData.description,
          createdAt: new Date().toISOString(),
        });

        for (const topicData of subjData.topics) {
          const tId = generateId();
          db.topics.push({
            _id: tId,
            id: tId,
            user: userId,
            subject: sId,
            title: topicData.title,
            description: "",
            status: "not_started",
            createdAt: new Date().toISOString(),
          });

          for (const stData of topicData.subTopics) {
            const stId = generateId();
            db.subtopics.push({
              _id: stId,
              id: stId,
              user: userId,
              subject: sId,
              topic: tId,
              title: stData.title,
              estimatedMinutes: stData.estimatedMinutes,
              notes: stData.notes || "",
              status: "not_started",
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
      subjects = db.subjects.filter((s) => (s.user || "").toString() === userId);
    }

    // Generate 14 days of historical study sessions for rich realistic charts
    const now = new Date();
    const sessionNotes = [
      "Completed in-depth concept breakdown & formulas",
      "Solved 15 PYQs from previous competitive exam papers",
      "Pomodoro focus cycle: reviewed core theorems and edge cases",
      "Flashcards active recall revision & speed test",
      "Practiced high-frequency questions and self-tested",
      "Reviewed textbook diagrams, clinical correlations & proofs",
    ];

    // Clear existing sessions/tasks for fresh demo experience
    db.sessions = db.sessions.filter((s) => (s.user || "").toString() !== userId);
    db.tasks = db.tasks.filter((t) => (t.user || "").toString() !== userId);

    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const d = new Date(now);
      d.setDate(d.getDate() - dayOffset);

      // 1 to 3 sessions per day
      const sessionCount = Math.floor(Math.random() * 2) + 1;
      for (let sc = 0; sc < sessionCount; sc++) {
        const randomSubj = subjects[Math.floor(Math.random() * subjects.length)];
        const sId = randomSubj._id || randomSubj.id;
        const sTopics = db.topics.filter((t) => (t.subject || "").toString() === sId.toString());
        const randomTopic = sTopics.length > 0 ? sTopics[Math.floor(Math.random() * sTopics.length)] : null;
        const duration = [30, 45, 60, 90, 120][Math.floor(Math.random() * 5)];
        const rating = [4, 5, 5, 4, 5, 3][Math.floor(Math.random() * 6)];

        db.sessions.push({
          _id: generateId(),
          user: userId,
          subject: sId,
          topic: randomTopic ? randomTopic._id || randomTopic.id : null,
          subTopic: null,
          sessionType: sc % 2 === 0 ? "timer" : "direct",
          durationMinutes: duration,
          date: d.toISOString(),
          productivityRating: rating,
          notes: sessionNotes[Math.floor(Math.random() * sessionNotes.length)],
          tags: ["theory", "practice"],
          createdAt: d.toISOString(),
        });
      }
    }

    // Generate realistic pending & completed tasks
    const taskTitles = [
      { title: "Complete 20 PYQ questions from Chapter 2", priority: "urgent", status: "in_progress", dueOffset: 1 },
      { title: "Revise high-yield flashcards and formulas", priority: "high", status: "todo", dueOffset: 2 },
      { title: "Take 1-Hour Full Syllabus Mock Test", priority: "urgent", status: "todo", dueOffset: 3 },
      { title: "Create Cheatsheet summary for quick revision", priority: "medium", status: "completed", dueOffset: -1 },
      { title: "Review mistakes from yesterday's mock test", priority: "high", status: "completed", dueOffset: 0 },
    ];

    taskTitles.forEach((t) => {
      const randomSubj = subjects[Math.floor(Math.random() * subjects.length)];
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + t.dueOffset);

      db.tasks.push({
        _id: generateId(),
        user: userId,
        subject: randomSubj._id || randomSubj.id,
        title: t.title,
        description: "Focus on accuracy and time management per question.",
        dueDate: dueDate.toISOString(),
        priority: t.priority,
        status: t.status,
        estimatedMinutes: 45,
        completedAt: t.status === "completed" ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      });
    });

    // Mark a few subtopics completed
    const userSubTopics = db.subtopics.filter((st) => (st.user || "").toString() === userId);
    userSubTopics.slice(0, Math.min(6, userSubTopics.length)).forEach((st) => {
      st.status = "completed";
    });

    // Update streak to 14 days
    const uIdx = db.users.findIndex((u) => u._id === userId || u.id === userId);
    if (uIdx !== -1) {
      db.users[uIdx].currentStreak = 14;
      db.users[uIdx].longestStreak = 18;
      const today = new Date();
      db.users[uIdx].lastStudyDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }

    writeDB(db);

    res.json({
      success: true,
      message: "Realistic demo data loaded successfully! 14 days of study history, tasks, and streaks populated.",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load demo data", error: err.message });
  }
};
