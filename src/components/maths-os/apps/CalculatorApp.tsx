import { useState } from "react";

const KEYS = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "−"],
  ["0", ".", "=", "+"],
];

// Tiny shunting-yard evaluator (no eval).
function evalExpr(expr: string): string {
  const e = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const tokens = e.match(/(\d+(?:\.\d+)?|[+\-*/()])/g);
  if (!tokens) return "0";
  const out: string[] = [];
  const ops: string[] = [];
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  for (const t of tokens) {
    if (/^\d/.test(t)) out.push(t);
    else if (t === "(") ops.push(t);
    else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()!);
      ops.pop();
    } else {
      while (ops.length && prec[ops[ops.length - 1]] >= prec[t]) out.push(ops.pop()!);
      ops.push(t);
    }
  }
  while (ops.length) out.push(ops.pop()!);
  const stack: number[] = [];
  for (const t of out) {
    if (/^\d/.test(t)) stack.push(parseFloat(t));
    else {
      const b = stack.pop()!;
      const a = stack.pop()!;
      if (t === "+") stack.push(a + b);
      else if (t === "-") stack.push(a - b);
      else if (t === "*") stack.push(a * b);
      else if (t === "/") stack.push(b === 0 ? NaN : a / b);
    }
  }
  const r = stack[0];
  if (!isFinite(r) || isNaN(r)) return "Error";
  return String(Math.round(r * 1e10) / 1e10);
}

export function CalculatorApp() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("0");
  const press = (k: string) => {
    if (k === "=") {
      setResult(evalExpr(expr || "0"));
    } else {
      setExpr((e) => e + k);
    }
  };
  return (
    <div className="mos-calc">
      <div className="mos-calc-display">
        <div className="mos-calc-expr">{expr || "\u00a0"}</div>
        <div className="mos-calc-result">{result}</div>
      </div>
      <div className="mos-calc-row">
        <button className="mos-calc-key util" onClick={() => { setExpr(""); setResult("0"); }}>AC</button>
        <button className="mos-calc-key util" onClick={() => setExpr((e) => e.slice(0, -1))}>⌫</button>
        <button className="mos-calc-key util" onClick={() => setExpr((e) => e + "(")}>(</button>
        <button className="mos-calc-key util" onClick={() => setExpr((e) => e + ")")}>)</button>
      </div>
      {KEYS.map((row, i) => (
        <div className="mos-calc-row" key={i}>
          {row.map((k) => (
            <button
              key={k}
              className={`mos-calc-key ${"+−×÷=".includes(k) ? "op" : ""}`}
              onClick={() => press(k)}
            >
              {k}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
