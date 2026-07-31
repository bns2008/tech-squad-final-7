"use client";

import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";

const EXAMPLE_SQL = `CREATE TABLE Teacher (
    Teacher_name VARCHAR(255) PRIMARY KEY
);

CREATE TABLE Courses (
    Course_ID VARCHAR(255) PRIMARY KEY,
    Course_name VARCHAR(255)
);

CREATE TABLE Teaches (
    Teacher_name VARCHAR(255),
    Course_ID VARCHAR(255)
);

ALTER TABLE Teaches
    ADD CONSTRAINT fk_teaches_teacher
    FOREIGN KEY (Teacher_name) REFERENCES Teacher(Teacher_name);

ALTER TABLE Teaches
    ADD CONSTRAINT fk_teaches_course
    FOREIGN KEY (Course_ID) REFERENCES Courses(Course_ID);`;

function TokenizedSQL({ code }: { code: string }) {
  const lines = code.split("\n");
  const keywords = ["CREATE", "TABLE", "VARCHAR", "PRIMARY", "KEY", "ALTER", "ADD", "CONSTRAINT", "FOREIGN", "REFERENCES", "NULL", "NOT"];
  const stringColor = "#22C55E";
  const kwColor = "#16A34A";
  const commentColor = "#6B7280";

  return (
    <pre className="code-font text-xs leading-5 overflow-x-auto">
      {lines.map((line, li) => {
        const tokens = line.split(/(\s+|[(),;])/);
        return (
          <span key={li} className="block">
            {tokens.map((tok, ti) => {
              if (keywords.includes(tok.toUpperCase()))
                return <span key={ti} style={{ color: kwColor, fontWeight: 600 }}>{tok}</span>;
              if (tok.startsWith("--"))
                return <span key={ti} style={{ color: commentColor }}>{tok}</span>;
              if (/VARCHAR|INT|SERIAL/.test(tok))
                return <span key={ti} style={{ color: stringColor }}>{tok}</span>;
              return <span key={ti} className="text-[var(--text)]">{tok}</span>;
            })}
          </span>
        );
      })}
    </pre>
  );
}

export default function ExamplePreview() {
  const copy = async () => {
    await navigator.clipboard.writeText(EXAMPLE_SQL);
    toast.success("Example SQL copied!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
      {/* Diagram */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-[var(--text)] mb-4">Example Diagram</h3>
        <ExampleDiagram />
      </div>

      {/* Generated SQL */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--text)]">Generated SQL</h3>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={copy}
            className="btn-ghost text-xs px-3 py-1.5"
          >
            <Copy size={12} />
            Copy
          </motion.button>
        </div>
        <div className="bg-[var(--surface)] dark:bg-[#111] rounded-xl p-4 overflow-auto max-h-[280px]">
          <TokenizedSQL code={EXAMPLE_SQL} />
        </div>
      </div>
    </div>
  );
}

function ExampleDiagram() {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      {/* Teacher entity */}
      <div className="border-2 border-[var(--primary)] rounded px-4 py-3 min-w-[110px]">
        <p className="text-xs font-bold text-[var(--text)] text-center mb-1">Teacher</p>
        <p className="text-[11px] text-[var(--text-muted)] text-center underline">Teacher_name (PK)</p>
      </div>

      {/* Relationship diamond */}
      <div className="relative flex items-center justify-center">
        <div
          className="w-14 h-14 border-2 border-[var(--primary)] rotate-45"
          style={{ backgroundColor: "transparent" }}
        />
        <span className="absolute text-[10px] font-bold text-[var(--primary)]">Teaches</span>
      </div>

      {/* Courses entity */}
      <div className="border-2 border-[var(--primary)] rounded px-4 py-3 min-w-[120px]">
        <p className="text-xs font-bold text-[var(--text)] text-center mb-1">Courses</p>
        <p className="text-[11px] text-[var(--text-muted)] text-center underline">Course_ID (PK)</p>
        <p className="text-[11px] text-[var(--text-muted)] text-center">Course_name</p>
      </div>
    </div>
  );
}
