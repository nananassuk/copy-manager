import { useState, useEffect, useCallback } from "react";

const ROUTES = ["네이버 밴드", "직접 전달", "기타"];
const DELIVERY_METHODS = ["직접 전달", "우편함", "학급 배부", "기타"];
const ADMIN_PW = "admin1234";

const today = () => new Date().toISOString().split("T")[0];
const diffDays = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 86400000);
const formatDate = (d) => d ? d.replace(/-/g, ".") : "-";
const getYM = (d) => d ? d.slice(0, 7) : "";

const statusBadge = (item) => {
  if (item.printed && item.deliveredDate) return { label: "완료", color: "#22c55e" };
  if (item.printed) return { label: "출력완료", color: "#3b82f6" };
  return { label: "미처리", color: "#f59e0b" };
};

const emptyForm = () => ({
  teacherId: "", teacherName: "", subject: "", requestDate: today(), title: "",
  route: "네이버 밴드", receiver: "", dueDate: "",
  printed: false, printedBy: "", copies: "", deliveredDate: "", deliveryMethod: "", memo: "",
});

const C = {
  wrap: { fontFamily: "'Noto Sans KR', sans-serif", minHeight: "100vh", background: "#f1f5f9" },
  header: { background: "linear-gradient(135deg, #1e40af, #3b82f6)", padding: "16px 20px", color: "#fff" },
  body: { padding: "12px 16px" },
  card: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  label: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, width: "100%", boxSizing: "border-box" },
  select: { padding: "7px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff" },
  btn: (bg = "#1e40af", fg = "#fff") => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }),
  btnOut: (color = "#1e40af") => ({ background: "#fff", color, border: `1px solid ${color}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13 }),
  btnOutSm: (color = "#475569") => ({ background: "transparent", color, border: `1px solid ${color}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }),
  badge: (color) => ({ display: "inline-block", background: color + "22", color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }),
  tab: (active) => ({ padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13, color: active ? "#1e40af" : "#64748b", background: "none", border: "none", borderBottom: active ? "2px solid #1e40af" : "2px solid transparent" }),
  frow: { marginBottom: 12 },
};

// localStorage 헬퍼
const storage = {
  get: (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

// 선생님 검색
function TeacherSearch({ teachers, value, onChange }) {
  const [query, setQuery] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const results = query.length > 0 ? teachers.filter(t => t.name.includes(query)) : teachers;
  useEffect(() => { setQuery(value?.name || ""); }, [value]);
  const select = (t) => { onChange(t); setQuery(t.name); setOpen(false); };
  return (
    <div style={{ position: "relative" }}>
      <input style={C.input} value={query}
        onChange={e => { setQuery(e.target.value); onChange(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="이름 검색..." autoComplete="off" />
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
          {results.length === 0
            ? <div style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8" }}>검색 결과 없음</div>
            : results.map(t => (
              <div key={t.id} onMouseDown={() => select(t)}
                style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                {t.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// 엑셀 업로드
function ExcelUploader({ teachers, saveTeachers }) {
  const [status, setStatus] = useState(null);
  const [dragging, setDragging] = useState(false);
  const processFile = async (file) => {
    if (!file) return;
    setStatus(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const names = rows.map(r => String(r[0] || "").trim()).filter(n => n && isNaN(Number(n)) && !/^(이름|성명|선생님|name)/i.test(n));
      const existing = new Set(teachers.map(t => t.name));
      const toAdd = [...new Set(names)].filter(n => !existing.has(n));
      if (toAdd.length > 0) {
        const merged = [...teachers, ...toAdd.map(name => ({ id: Date.now().toString() + Math.random(), name }))];
        merged.sort((a, b) => a.name.localeCompare(b.name));
        saveTeachers(merged);
      }
      setStatus({ added: toAdd.length, skipped: names.length - toAdd.length });
    } catch { setStatus({ error: "파일을 읽는 중 오류가 발생했습니다." }); }
  };
  return (
    <div>
      <label onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", border: `2px dashed ${dragging ? "#3b82f6" : "#cbd5e1"}`, borderRadius: 10, padding: "16px 12px", cursor: "pointer", background: dragging ? "#eff6ff" : "#fff" }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>📊</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>클릭하거나 파일을 드래그</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>.xlsx / .xls · A열에 이름</div>
        <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
      </label>
      {status && (
        <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: status.error ? "#fee2e2" : "#dcfce7", fontSize: 12 }}>
          {status.error ? <span style={{ color: "#dc2626" }}>❌ {status.error}</span>
            : <span style={{ color: "#166534", fontWeight: 700 }}>✅ {status.added}명 등록{status.skipped > 0 ? ` · 중복 ${status.skipped}명 제외` : ""}</span>}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [requests, setRequests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [adminTab, setAdminTab] = useState("teachers");
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [filterTeacher, setFilterTeacher] = useState("전체");
  const [filterSubject, setFilterSubject] = useState("전체");
  const [sortBy, setSortBy] = useState("requestDate");
  const [search, setSearch] = useState("");
  const [teacherForm, setTeacherForm] = useState({ name: "" });
  const [editTeacherId, setEditTeacherId] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [deleteFrom, setDeleteFrom] = useState("");
  const [deleteTo, setDeleteTo] = useState("");
  const [selYear, setSelYear] = useState(new Date().getFullYear().toString());

  const load = useCallback(() => {
    const r = storage.get("copy_requests");
    const t = storage.get("copy_teachers");
    if (r) setRequests(r);
    if (t) setTeachers(t);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveReq = (data) => { storage.set("copy_requests", data); setRequests(data); };
  const saveTeachers = (data) => { storage.set("copy_teachers", data); setTeachers(data); };

  const alerts = requests.filter(r => {
    if (r.printed && r.deliveredDate) return false;
    if (!r.dueDate) return false;
    const d = diffDays(today(), r.dueDate);
    return d >= 0 && d <= 1;
  });

  const subjectsFor = (tid) => tid === "전체" ? [] : [...new Set(requests.filter(r => r.teacherId === tid && r.subject).map(r => r.subject))].sort();
  const availableSubs = subjectsFor(filterTeacher);

  const filtered = requests
    .filter(r => filterTeacher === "전체" || r.teacherId === filterTeacher)
    .filter(r => filterSubject === "전체" || r.subject === filterSubject)
    .filter(r => !search || r.title.includes(search) || r.teacherName.includes(search) || (r.subject || "").includes(search))
    .sort((a, b) => {
      if (sortBy === "requestDate") return a.requestDate < b.requestDate ? -1 : 1;
      if (sortBy === "dueDate") { if (!a.dueDate) return 1; if (!b.dueDate) return -1; return a.dueDate < b.dueDate ? -1 : 1; }
      if (sortBy === "teacher") return a.teacherName.localeCompare(b.teacherName);
      return 0;
    });

  // 로그인
  if (!role) return (
    <div style={{ ...C.wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 300, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>복사 요청 관리</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 24 }}>접속 방식을 선택하세요</div>
        <button style={{ ...C.btn("#1e40af"), width: "100%", marginBottom: 10, padding: 10 }} onClick={() => { setRole("user"); setView("dashboard"); }}>👤 사용자로 접속</button>
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>관리자 로그인</div>
          <input style={{ ...C.input, marginBottom: 8 }} type="password" placeholder="비밀번호" value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => { if (e.key === "Enter") { if (pwInput === ADMIN_PW) { setRole("admin"); setView("dashboard"); setPwInput(""); } else setPwError(true); } }} />
          {pwError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 6 }}>비밀번호가 틀렸습니다</div>}
          <button style={{ ...C.btn("#475569"), width: "100%", padding: 10 }} onClick={() => {
            if (pwInput === ADMIN_PW) { setRole("admin"); setView("dashboard"); setPwInput(""); } else setPwError(true);
          }}>관리자로 접속</button>
        </div>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

  // 대시보드
  const Dashboard = () => {
    const months = Array.from({ length: 12 }, (_, i) => `${selYear}-${String(i + 1).padStart(2, "0")}`);
    const yearReqs = requests.filter(r => r.requestDate?.startsWith(selYear));
    const monthTotals = months.map(ym => ({
      count: yearReqs.filter(r => getYM(r.requestDate) === ym).length,
      copies: yearReqs.filter(r => getYM(r.requestDate) === ym).reduce((s, r) => s + (Number(r.copies) || 0), 0),
    }));
    const grandCount = yearReqs.length;
    const grandCopies = yearReqs.reduce((s, r) => s + (Number(r.copies) || 0), 0);
    const filteredT = teachers.filter(t => !teacherSearch || t.name.includes(teacherSearch));
    const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));
    const cell = (w, center = true, bg = "", bold = false, color = "#1e293b", border = "") => ({
      width: w, minWidth: w, maxWidth: w, padding: "5px 6px", fontSize: 11,
      textAlign: center ? "center" : "left", background: bg, fontWeight: bold ? 700 : 400,
      color, borderRight: border || "1px solid #e2e8f0", boxSizing: "border-box", lineHeight: 1.4,
    });
    return (
      <>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>📊 연간 현황</span>
          <select style={C.select} value={selYear} onChange={e => setSelYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <input style={{ ...C.input, width: 110 }} placeholder="선생님 검색" value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[["연간 신청", grandCount + "건", "#dbeafe"], ["완료", yearReqs.filter(r => r.printed && r.deliveredDate).length + "건", "#dcfce7"],
            ["미처리", yearReqs.filter(r => !r.printed || !r.deliveredDate).length + "건", "#fef9c3"],
            ["연간 총부수", grandCopies.toLocaleString() + "부", "#ede9fe"]].map(([l, v, c]) => (
            <div key={l} style={{ background: c, borderRadius: 10, padding: "10px 14px", flex: 1, minWidth: 80, textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>{v}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflowX: "auto" }}>
          <div style={{ display: "flex", background: "#1e40af", borderRadius: "12px 12px 0 0" }}>
            <div style={{ ...cell(80, false, "", true, "#fff"), borderRight: "1px solid #3b82f6" }}>선생님</div>
            <div style={{ ...cell(52, true, "", true, "#fff"), borderRight: "1px solid #3b82f6" }}>구분</div>
            {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ ...cell(46, true, "", true, "#fff"), borderRight: "1px solid #3b82f6" }}>{i + 1}월</div>)}
            <div style={{ ...cell(52, true, "", true, "#fff"), borderRight: "none" }}>총계</div>
          </div>
          <div style={{ background: "#1e3a8a" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #2563eb" }}>
              <div style={{ ...cell(80, false, "", true, "#fff", "1px solid #2563eb") }}>월별총계</div>
              <div style={{ ...cell(52, true, "", false, "#bfdbfe", "1px solid #2563eb"), fontSize: 10 }}>신청건수</div>
              {monthTotals.map((m, i) => <div key={i} style={{ ...cell(46, true, "", true, "#fff", "1px solid #2563eb") }}>{m.count || ""}</div>)}
              <div style={{ ...cell(52, true, "", true, "#fbbf24", "none") }}>{grandCount}</div>
            </div>
            <div style={{ display: "flex", borderBottom: "2px solid #3b82f6" }}>
              <div style={{ ...cell(80, false, "", false, "#fff", "1px solid #2563eb") }}></div>
              <div style={{ ...cell(52, true, "", false, "#bfdbfe", "1px solid #2563eb"), fontSize: 10 }}>총부수</div>
              {monthTotals.map((m, i) => <div key={i} style={{ ...cell(46, true, "", false, "#e0f2fe", "1px solid #2563eb") }}>{m.copies ? m.copies.toLocaleString() : ""}</div>)}
              <div style={{ ...cell(52, true, "", true, "#fbbf24", "none") }}>{grandCopies ? grandCopies.toLocaleString() : ""}</div>
            </div>
          </div>
          {filteredT.map((t, ti) => {
            const tReqs = yearReqs.filter(r => r.teacherId === t.id);
            const tMonths = months.map(ym => ({
              count: tReqs.filter(r => getYM(r.requestDate) === ym).length,
              copies: tReqs.filter(r => getYM(r.requestDate) === ym).reduce((s, r) => s + (Number(r.copies) || 0), 0),
            }));
            const tTotal = tReqs.length;
            const tCopies = tReqs.reduce((s, r) => s + (Number(r.copies) || 0), 0);
            const bg = ti % 2 === 0 ? "#fff" : "#f8fafc";
            return (
              <div key={t.id}>
                <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ ...cell(80, false, bg, true, "#1d4ed8"), fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => { setFilterTeacher(t.id); setFilterSubject("전체"); setView("list"); }}>{t.name}</div>
                  <div style={{ ...cell(52, true, bg, false, "#64748b"), fontSize: 10 }}>신청건수</div>
                  {tMonths.map((m, i) => <div key={i} style={{ ...cell(46, true, bg, m.count > 0, m.count > 0 ? "#1d4ed8" : "#94a3b8") }}>{m.count || ""}</div>)}
                  <div style={{ ...cell(52, true, bg, true, "#1e293b"), borderRight: "none" }}>{tTotal || 0}</div>
                </div>
                <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0" }}>
                  <div style={{ ...cell(80, false, bg, false, "#94a3b8") }}></div>
                  <div style={{ ...cell(52, true, bg, false, "#64748b"), fontSize: 10 }}>총부수</div>
                  {tMonths.map((m, i) => <div key={i} style={{ ...cell(46, true, bg, false, m.copies > 0 ? "#7c3aed" : "#94a3b8") }}>{m.copies ? m.copies.toLocaleString() : ""}</div>)}
                  <div style={{ ...cell(52, true, bg, true, "#7c3aed"), borderRight: "none" }}>{tCopies ? tCopies.toLocaleString() : 0}</div>
                </div>
              </div>
            );
          })}
          {filteredT.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>선생님이 없습니다</div>}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, textAlign: "center" }}>선생님 이름 클릭 시 해당 요청 목록으로 이동</div>
      </>
    );
  };

  // 요청 폼
  const FormView = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button style={C.btnOut()} onClick={() => { setView("list"); setEditId(null); setForm(emptyForm()); }}>← 목록</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editId ? "요청 수정" : "새 요청 등록"}</h3>
      </div>
      <div style={C.card}>
        <div style={C.frow}>
          <label style={C.label}>선생님 *</label>
          <TeacherSearch teachers={teachers} value={form.teacherId ? { id: form.teacherId, name: form.teacherName } : null}
            onChange={t => setForm({ ...form, teacherId: t?.id || "", teacherName: t?.name || "" })} />
          {!form.teacherId && form.teacherName && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>목록에서 선택해주세요</div>}
        </div>
        <div style={C.frow}><label style={C.label}>과목</label><input style={C.input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="예: 수학, 국어" /></div>
        <div style={C.frow}><label style={C.label}>신청일자 *</label><input type="date" style={C.input} value={form.requestDate} onChange={e => setForm({ ...form, requestDate: e.target.value })} /></div>
        <div style={C.frow}><label style={C.label}>완료 요청일</label><input type="date" style={C.input} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
        <div style={C.frow}><label style={C.label}>제목 / 내용 *</label><input style={C.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="예: 3학년 수학 시험지 30부" /></div>
        <div style={C.frow}>
          <label style={C.label}>신청 루트</label>
          <select style={C.select} value={form.route} onChange={e => setForm({ ...form, route: e.target.value })}>
            {ROUTES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={C.frow}><label style={C.label}>접수자</label><input style={C.input} value={form.receiver} onChange={e => setForm({ ...form, receiver: e.target.value })} placeholder="이름 직접 입력" /></div>
        <div style={C.frow}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.printed} onChange={e => setForm({ ...form, printed: e.target.checked })} />출력 완료
          </label>
        </div>
        {form.printed && (<>
          <div style={C.frow}><label style={C.label}>복사 담당자</label><input style={C.input} value={form.printedBy} onChange={e => setForm({ ...form, printedBy: e.target.value })} placeholder="이름 직접 입력" /></div>
          <div style={C.frow}><label style={C.label}>출력 부수</label><input type="number" min="0" style={C.input} value={form.copies} onChange={e => setForm({ ...form, copies: e.target.value })} placeholder="예: 150" /></div>
          <div style={C.frow}><label style={C.label}>전달일자</label><input type="date" style={C.input} value={form.deliveredDate} onChange={e => setForm({ ...form, deliveredDate: e.target.value })} /></div>
          <div style={C.frow}>
            <label style={C.label}>전달 방식</label>
            <select style={C.select} value={form.deliveryMethod} onChange={e => setForm({ ...form, deliveryMethod: e.target.value })}>
              <option value="">선택</option>
              {DELIVERY_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </>)}
        <div style={C.frow}><label style={C.label}>메모</label><input style={C.input} value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} placeholder="특이사항" /></div>
        <button style={C.btn()} onClick={() => {
          if (!form.teacherId || !form.title || !form.requestDate) { alert("선생님, 제목, 신청일자는 필수입니다."); return; }
          const newList = editId ? requests.map(r => r.id === editId ? { ...form, id: editId } : r) : [...requests, { ...form, id: Date.now().toString() }];
          saveReq(newList); setForm(emptyForm()); setEditId(null); setView("list");
        }}>{editId ? "수정 완료" : "등록"}</button>
      </div>
    </>
  );

  // 목록
  const ListView = () => {
    const total = requests.length, done = requests.filter(r => r.printed && r.deliveredDate).length;
    return (
      <>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[["전체", total, "#dbeafe"], ["완료", done, "#dcfce7"], ["미처리", total - done, "#fef9c3"], ["마감임박", alerts.length, alerts.length > 0 ? "#fee2e2" : "#f1f5f9"]].map(([l, n, c]) => (
            <div key={l} style={{ background: c, borderRadius: 10, padding: "10px 14px", flex: 1, minWidth: 70, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: l === "마감임박" && alerts.length > 0 ? "#dc2626" : "#1e293b" }}>{n}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button style={C.btn()} onClick={() => { setForm(emptyForm()); setEditId(null); setView("form"); }}>+ 새 요청</button>
          <select style={C.select} value={filterTeacher} onChange={e => { setFilterTeacher(e.target.value); setFilterSubject("전체"); }}>
            <option value="전체">전체 선생님</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select style={C.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="requestDate">신청일 순</option>
            <option value="dueDate">마감일 순</option>
            <option value="teacher">선생님 순</option>
          </select>
          <input style={{ ...C.input, width: 110 }} placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filterTeacher !== "전체" && availableSubs.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {["전체", ...availableSubs].map(sub => (
              <button key={sub} onClick={() => setFilterSubject(sub)} style={{ background: filterSubject === sub ? "#7c3aed" : "#fff", color: filterSubject === sub ? "#fff" : "#7c3aed", border: "1px solid #7c3aed", borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                {sub === "전체" ? "전체 과목" : sub}
              </button>
            ))}
          </div>
        )}
        {filtered.length === 0
          ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>등록된 요청이 없습니다</div>
          : filtered.map(item => {
            const st = statusBadge(item);
            const completed = item.printed && item.deliveredDate;
            const dDiff = item.dueDate ? diffDays(today(), item.dueDate) : null;
            return (
              <div key={item.id} style={{ background: completed ? "#f8fafc" : "#fff", borderRadius: 12, padding: 14, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `4px solid ${completed ? "#22c55e" : "#f59e0b"}`, opacity: completed ? 0.78 : 1 }}>
                <div>
                  <span style={C.badge(st.color)}>{st.label}</span>
                  {item.subject && <span style={{ display: "inline-block", background: "#ede9fe", color: "#7c3aed", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>{item.subject}</span>}
                  {!completed && dDiff !== null && dDiff <= 1 && <span style={C.badge("#ef4444")}>{dDiff === 0 ? "오늘마감" : "내일마감"}</span>}
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginTop: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{item.teacherName} 선생님{item.subject ? ` · ${item.subject}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>📅 {formatDate(item.requestDate)}</span>
                  {item.dueDate && <span style={{ fontSize: 12, color: dDiff !== null && dDiff <= 1 && !completed ? "#ef4444" : "#64748b" }}>⏰ {formatDate(item.dueDate)}</span>}
                  <span style={{ fontSize: 12, color: "#64748b" }}>📨 {item.route}</span>
                  {item.receiver && <span style={{ fontSize: 12, color: "#64748b" }}>👤 {item.receiver}</span>}
                  {item.printedBy && <span style={{ fontSize: 12, color: "#64748b" }}>🖨️ {item.printedBy}</span>}
                  {item.copies && <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>📄 {Number(item.copies).toLocaleString()}부</span>}
                  {item.deliveredDate && <span style={{ fontSize: 12, color: "#64748b" }}>✅ {formatDate(item.deliveredDate)}{item.deliveryMethod ? ` (${item.deliveryMethod})` : ""}</span>}
                  {item.memo && <span style={{ fontSize: 12, color: "#94a3b8" }}>💬 {item.memo}</span>}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button style={C.btnOutSm(item.printed ? "#22c55e" : "#f59e0b")} onClick={() => saveReq(requests.map(r => r.id === item.id ? { ...r, printed: !r.printed } : r))}>
                    {item.printed ? "✓ 출력완료" : "출력전"}
                  </button>
                  <button style={C.btnOutSm("#3b82f6")} onClick={() => { setForm({ ...item }); setEditId(item.id); setView("form"); }}>수정</button>
                  {role === "admin" && <button style={C.btnOutSm("#ef4444")} onClick={() => { if (!confirm("삭제하시겠습니까?")) return; saveReq(requests.filter(r => r.id !== item.id)); }}>삭제</button>}
                </div>
              </div>
            );
          })}
      </>
    );
  };

  // 관리자
  const AdminView = () => {
    const filteredT = teachers.filter(t => !teacherSearch || t.name.includes(teacherSearch));
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button style={C.btnOut()} onClick={() => setView("dashboard")}>← 대시보드</button>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>관리자 메뉴</h3>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
          <button style={C.tab(adminTab === "teachers")} onClick={() => setAdminTab("teachers")}>선생님 관리</button>
          <button style={C.tab(adminTab === "deleteRange")} onClick={() => setAdminTab("deleteRange")}>데이터 삭제</button>
        </div>
        {adminTab === "teachers" && (
          <div style={C.card}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>선생님 개별 등록</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input style={{ ...C.input, flex: 1 }} value={teacherForm.name} onChange={e => setTeacherForm({ name: e.target.value })} placeholder="선생님 이름"
                onKeyDown={e => {
                  if (e.key !== "Enter") return;
                  const name = teacherForm.name.trim(); if (!name) return;
                  if (editTeacherId) { saveTeachers(teachers.map(t => t.id === editTeacherId ? { ...t, name } : t)); setEditTeacherId(null); }
                  else { if (teachers.some(t => t.name === name)) { alert("이미 등록된 이름입니다."); return; } saveTeachers([...teachers, { id: Date.now().toString(), name }].sort((a, b) => a.name.localeCompare(b.name))); }
                  setTeacherForm({ name: "" });
                }} />
              <button style={C.btn(editTeacherId ? "#059669" : "#1e40af")} onClick={() => {
                const name = teacherForm.name.trim(); if (!name) return;
                if (editTeacherId) { saveTeachers(teachers.map(t => t.id === editTeacherId ? { ...t, name } : t)); setEditTeacherId(null); }
                else { if (teachers.some(t => t.name === name)) { alert("이미 등록된 이름입니다."); return; } saveTeachers([...teachers, { id: Date.now().toString(), name }].sort((a, b) => a.name.localeCompare(b.name))); }
                setTeacherForm({ name: "" });
              }}>{editTeacherId ? "수정완료" : "등록"}</button>
              {editTeacherId && <button style={C.btn("#94a3b8")} onClick={() => { setEditTeacherId(null); setTeacherForm({ name: "" }); }}>취소</button>}
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px dashed #cbd5e1" }}>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>📂 엑셀로 일괄 등록</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>A열에 선생님 이름 · 헤더/중복 자동 제외</div>
              <ExcelUploader teachers={teachers} saveTeachers={saveTeachers} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>등록된 선생님 ({teachers.length}명)</div>
              <input style={{ ...C.input, width: 120 }} placeholder="이름 검색" value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} />
            </div>
            {filteredT.length === 0
              ? <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 16 }}>등록된 선생님이 없습니다</div>
              : filteredT.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 14 }}>{t.name}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={C.btnOutSm("#3b82f6")} onClick={() => { setEditTeacherId(t.id); setTeacherForm({ name: t.name }); }}>수정</button>
                    <button style={C.btnOutSm("#ef4444")} onClick={() => { if (!confirm(`"${t.name}" 선생님을 삭제하시겠습니까?`)) return; saveTeachers(teachers.filter(x => x.id !== t.id)); }}>삭제</button>
                  </div>
                </div>
              ))}
          </div>
        )}
        {adminTab === "deleteRange" && (
          <div style={C.card}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>기간 선택 삭제</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>신청일자 기준 · 해당 기간의 복사 요청이 모두 삭제됩니다</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 130 }}><label style={C.label}>시작일</label><input type="date" style={C.input} value={deleteFrom} onChange={e => setDeleteFrom(e.target.value)} /></div>
              <div style={{ paddingTop: 20, color: "#94a3b8", fontWeight: 700 }}>~</div>
              <div style={{ flex: 1, minWidth: 130 }}><label style={C.label}>종료일</label><input type="date" style={C.input} value={deleteTo} onChange={e => setDeleteTo(e.target.value)} /></div>
            </div>
            {deleteFrom && deleteTo && (() => {
              if (deleteFrom > deleteTo) return <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 10 }}>시작일이 종료일보다 늦습니다</div>;
              const cnt = requests.filter(r => r.requestDate >= deleteFrom && r.requestDate <= deleteTo).length;
              return <div style={{ fontSize: 13, marginBottom: 12, padding: "8px 12px", background: cnt > 0 ? "#fef3c7" : "#f1f5f9", borderRadius: 8, color: cnt > 0 ? "#92400e" : "#64748b" }}>
                {deleteFrom.replace(/-/g, ".")} ~ {deleteTo.replace(/-/g, ".")} · <strong>{cnt}건</strong> 삭제 예정
              </div>;
            })()}
            <button style={C.btn("#ef4444")} onClick={() => {
              if (!deleteFrom || !deleteTo) { alert("날짜를 모두 선택해주세요."); return; }
              if (deleteFrom > deleteTo) { alert("시작일이 종료일보다 늦습니다."); return; }
              const cnt = requests.filter(r => r.requestDate >= deleteFrom && r.requestDate <= deleteTo).length;
              if (cnt === 0) { alert("해당 기간에 삭제할 요청이 없습니다."); return; }
              if (!confirm(`${deleteFrom.replace(/-/g, ".")} ~ ${deleteTo.replace(/-/g, ".")} 기간의 요청 ${cnt}건을 삭제하시겠습니까?\n복구가 불가능합니다.`)) return;
              saveReq(requests.filter(r => r.requestDate < deleteFrom || r.requestDate > deleteTo));
              setDeleteFrom(""); setDeleteTo(""); alert("삭제 완료");
            }}>삭제 실행</button>
          </div>
        )}
      </>
    );
  };

  const navItems = [
    { key: "dashboard", label: "📊 현황" },
    { key: "list", label: "📋 목록" },
    ...(role === "admin" ? [{ key: "admin", label: "⚙️ 관리" }] : []),
  ];

  return (
    <div style={C.wrap}>
      <div style={C.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>📋 복사 요청 관리</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.85 }}>{role === "admin" ? "🔐 관리자" : "👤 사용자"} 모드</p>
          </div>
          <button style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}
            onClick={() => { setRole(null); setPwInput(""); }}>로그아웃</button>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => setView(n.key)} style={{ background: view === n.key ? "rgba(255,255,255,0.25)" : "transparent", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: view === n.key ? 700 : 400 }}>{n.label}</button>
          ))}
        </div>
      </div>
      {alerts.length > 0 && view !== "admin" && (
        <div style={{ background: "#fef3c7", borderLeft: "4px solid #f59e0b", margin: "12px 16px", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, color: "#92400e", fontSize: 13, marginBottom: 4 }}>⚠️ 마감 임박 ({alerts.length}건)</div>
          {alerts.map(a => (
            <div key={a.id} style={{ fontSize: 12, color: "#78350f", padding: "2px 0" }}>
              • {a.teacherName}{a.subject ? ` [${a.subject}]` : ""} | {a.title} — {formatDate(a.dueDate)}
              {diffDays(today(), a.dueDate) === 0 ? " 🔴 오늘까지!" : " 🟡 내일까지!"}
            </div>
          ))}
        </div>
      )}
      <div style={C.body}>
        {view === "dashboard" && <Dashboard />}
        {view === "list" && <ListView />}
        {view === "form" && <FormView />}
        {view === "admin" && role === "admin" && <AdminView />}
      </div>
    </div>
  );
}