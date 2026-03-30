import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wvztbbkwsguvdmwqsggq.supabase.co";
const SUPABASE_KEY = "sb_publishable_9JBuEItZTGfeFRu_nrahIw_nyFBfM6E";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ROUTES = ["네이버 밴드", "직접 전달", "기타"];
const DELIVERY_METHODS = ["직접 전달", "우편함", "학급 배부", "기타"];
const CLASSES = ["1교시","2교시","3교시","4교시","5교시","6교시","7교시","8교시","9교시","야간수업"];
const CLASS_ORDER = {"1교시":1,"2교시":2,"3교시":3,"4교시":4,"5교시":5,"6교시":6,"7교시":7,"8교시":8,"9교시":9,"야간수업":10};
const PAPER_SIZES = ["A4","A3","B4","B5"];
const DAYS = ["일","월","화","수","목","금","토"];
const ADMIN_PW = "admin1234";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const diffDays = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 86400000);
const formatDate = (d) => d ? d.replace(/-/g, ".") : "-";
const getYM = (d) => d ? d.slice(0, 7) : "";
const getDayLabel = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return `(${DAYS[d.getDay()]})`;
};
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});
const getPrevDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
};

const calcSheets = (pages, copies, isDuplex) => {
  if (!pages || !copies) return 0;
  return isDuplex ? Math.ceil(Number(pages) / 2) * Number(copies) : Number(pages) * Number(copies);
};
const calcCounter = (pages, copies) => {
  if (!pages || !copies) return 0;
  return Number(pages) * Number(copies);
};

const statusBadge = (item) => {
  if (item.printed && item.deliveredDate) return { label: "완료", color: "#22c55e" };
  if (item.printed) return { label: "출력완료", color: "#3b82f6" };
  return { label: "미처리", color: "#f59e0b" };
};

const emptyForm = () => ({
  teacherId: "", teacherName: "", subject: "",
  requestDate: today(), requestTime: "09:00",
  title: "", route: "네이버 밴드", receiver: "",
  dueDate: "", dueClass: "",
  paperSize: "A4", isDuplex: false, pages: "", copies: "",
  printed: false, printedBy: "",
  deliveredDate: "", deliveryMethod: "", memo: "",
});

const toSupabase = (r) => ({
  teacher_id: r.teacherId || null,
  teacher_name: r.teacherName,
  subject: r.subject || null,
  title: r.title,
  request_date: r.requestDate ? `${r.requestDate} ${r.requestTime || "00:00"}` : null,
  due_date: r.dueDate || null,
  due_class: r.dueClass || null,
  route: r.route || null,
  receiver: r.receiver || null,
  is_printed: r.printed || false,
  print_handler: r.printedBy || null,
  copies: r.copies !== "" && r.copies != null ? Number(r.copies) : null,
  paper_size: r.paperSize || null,
  is_duplex: r.isDuplex || false,
  pages: r.pages !== "" && r.pages != null ? Number(r.pages) : null,
  delivery_date: r.deliveredDate || null,
  delivery_method: r.deliveryMethod || null,
  memo: r.memo || null,
});

const fromSupabase = (r) => {
  const rdParts = (r.request_date || "").split(" ");
  return {
    id: r.id,
    teacherId: r.teacher_id || "",
    teacherName: r.teacher_name || "",
    subject: r.subject || "",
    title: r.title || "",
    requestDate: rdParts[0] || "",
    requestTime: rdParts[1] || "00:00",
    dueDate: r.due_date || "",
    dueClass: r.due_class || "",
    route: r.route || "네이버 밴드",
    receiver: r.receiver || "",
    printed: r.is_printed || false,
    printedBy: r.print_handler || "",
    copies: r.copies != null ? String(r.copies) : "",
    paperSize: r.paper_size || "A4",
    isDuplex: r.is_duplex || false,
    pages: r.pages != null ? String(r.pages) : "",
    deliveredDate: r.delivery_date || "",
    deliveryMethod: r.delivery_method || "",
    memo: r.memo || "",
  };
};

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

/* ── 선생님 검색 ── */
function TeacherSearch({ teachers, value, onChange }) {
  const [query, setQuery] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const results = query.length > 0 ? teachers.filter(t => t.name.includes(query)) : teachers;
  useEffect(() => { setQuery(value?.name || ""); }, [value]);
  const select = (t) => { onChange(t); setQuery(t.name); setOpen(false); };
  const handleBlur = () => {
    setTimeout(() => {
      const exact = teachers.find(t => t.name === query.trim());
      if (exact) onChange(exact);
      else if (!query.trim()) onChange(null);
      setOpen(false);
    }, 150);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && results.length > 0) select(results[0]);
    if (e.key === "Escape") setOpen(false);
  };
  return (
    <div style={{ position: "relative" }}>
      <input style={C.input} value={query}
        onChange={e => { setQuery(e.target.value); onChange(null); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={handleBlur} onKeyDown={handleKeyDown}
        placeholder="이름 검색 후 엔터 or 클릭..." autoComplete="off" />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
          {results.map(t => (
            <div key={t.id} onMouseDown={() => select(t)}
              style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={e => e.currentTarget.style.background = ""}>{t.name}</div>
          ))}
        </div>
      )}
      {open && query.length > 0 && results.length === 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#94a3b8", zIndex: 100 }}>검색 결과 없음</div>
      )}
    </div>
  );
}

/* ── 엑셀 업로드 ── */
function ExcelUploader({ teachers, onBulkAdd }) {
  const [status, setStatus] = useState(null);
  const [dragging, setDragging] = useState(false);
  const processFile = async (file) => {
    if (!file) return;
    setStatus(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const names = rows.map(r => String(r[0] || "").trim()).filter(n => n && isNaN(Number(n)) && !/^(이름|성명|선생님|name)/i.test(n));
      const existing = new Set(teachers.map(t => t.name));
      const toAdd = [...new Set(names)].filter(n => !existing.has(n));
      await onBulkAdd(toAdd);
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

/* ── 요청 폼 ── */
function FormView({ teachers, form, setForm, editId, onSave, onCancel, allRequests }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const sheets = calcSheets(form.pages, form.copies, form.isDuplex);
  const counter = calcCounter(form.pages, form.copies);

  // 제목 유사 검색
  const titleQuery = form.title.trim();
  const similarTitles = titleQuery.length >= 2
    ? allRequests.filter(r => r.id !== editId && r.title.includes(titleQuery))
    : [];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button style={C.btnOut()} onClick={onCancel}>← 목록</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editId ? "요청 수정" : "새 요청 등록"}</h3>
      </div>
      <div style={C.card}>
        {/* 선생님 */}
        <div style={C.frow}>
          <label style={C.label}>선생님 *</label>
          <TeacherSearch teachers={teachers} value={form.teacherId ? { id: form.teacherId, name: form.teacherName } : null}
            onChange={t => setForm(f => ({ ...f, teacherId: t?.id || "", teacherName: t?.name || "" }))} />
          {!form.teacherId && form.teacherName && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>목록에서 선택해주세요</div>}
        </div>
        {/* 과목 */}
        <div style={C.frow}>
          <label style={C.label}>과목</label>
          <input style={C.input} value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="예: 수학, 국어" />
        </div>
        {/* 신청일시 */}
        <div style={C.frow}>
          <label style={C.label}>신청일시(접수일시) *</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" style={{ ...C.input, flex: 2 }} value={form.requestDate} onChange={e => set("requestDate", e.target.value)} />
            <select style={{ ...C.select, flex: 1 }} value={form.requestTime} onChange={e => set("requestTime", e.target.value)}>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {/* 완료 요청일 */}
        <div style={C.frow}>
          <label style={C.label}>완료 요청일</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" style={{ ...C.input, flex: 2 }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            {form.dueDate && <span style={{ fontSize: 14, fontWeight: 700, color: "#1e40af", whiteSpace: "nowrap" }}>{getDayLabel(form.dueDate)}</span>}
            <select style={{ ...C.select, flex: 1 }} value={form.dueClass} onChange={e => set("dueClass", e.target.value)}>
              <option value="">교시 선택</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {/* 제목 + 유사 요청 알림 */}
        <div style={C.frow}>
          <label style={C.label}>제목 / 내용 *</label>
          <input style={C.input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="예: 3학년 수학 시험지" />
          {similarTitles.length > 0 && (
            <div style={{ marginTop: 6, padding: "8px 12px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>⚠️ 유사한 제목의 요청이 {similarTitles.length}건 있어요!</div>
              {similarTitles.slice(0, 3).map(r => (
                <div key={r.id} style={{ fontSize: 11, color: "#78350f", padding: "2px 0" }}>
                  • {r.teacherName} | {r.title} ({formatDate(r.requestDate)}) — {statusBadge(r).label}
                </div>
              ))}
              {similarTitles.length > 3 && <div style={{ fontSize: 11, color: "#78350f" }}>외 {similarTitles.length - 3}건...</div>}
            </div>
          )}
        </div>

        {/* 출력 사양 */}
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 10 }}>📄 출력 사양</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={C.label}>규격</label>
              <select style={{ ...C.select, width: "100%" }} value={form.paperSize} onChange={e => set("paperSize", e.target.value)}>
                {PAPER_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={C.label}>인쇄 방식</label>
              <div style={{ display: "flex", gap: 4 }}>
                {["단면", "양면"].map(v => (
                  <button key={v} onClick={() => set("isDuplex", v === "양면")}
                    style={{ flex: 1, padding: "7px 0", border: `1px solid ${(v === "양면") === form.isDuplex ? "#1e40af" : "#cbd5e1"}`,
                      borderRadius: 8, background: (v === "양면") === form.isDuplex ? "#1e40af" : "#fff",
                      color: (v === "양면") === form.isDuplex ? "#fff" : "#374151",
                      cursor: "pointer", fontWeight: 600, fontSize: 13 }}>{v}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={C.label}>페이지 수</label>
              <input type="number" min="1" style={C.input} value={form.pages} onChange={e => set("pages", e.target.value)} placeholder="예: 30" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={C.label}>요청 부수</label>
              <input type="number" min="1" style={C.input} value={form.copies} onChange={e => set("copies", e.target.value)} placeholder="예: 135" />
            </div>
          </div>
          {form.pages && form.copies && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "#dbeafe", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1e40af" }}>{sheets.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>용지매수</div>
              </div>
              <div style={{ flex: 1, background: "#ede9fe", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#7c3aed" }}>{counter.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>예상 카운터</div>
              </div>
            </div>
          )}
        </div>

        {/* 신청 루트 */}
        <div style={C.frow}>
          <label style={C.label}>신청 루트</label>
          <select style={C.select} value={form.route} onChange={e => set("route", e.target.value)}>
            {ROUTES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        {/* 접수자 */}
        <div style={C.frow}>
          <label style={C.label}>접수자</label>
          <input style={C.input} value={form.receiver} onChange={e => set("receiver", e.target.value)} placeholder="이름 직접 입력" />
        </div>
        {/* 출력 완료 */}
        <div style={C.frow}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.printed} onChange={e => set("printed", e.target.checked)} />출력 완료
          </label>
        </div>
        {form.printed && (
          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid #86efac" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#166534", marginBottom: 10 }}>✅ 출력 완료 정보</div>
            <div style={C.frow}>
              <label style={C.label}>복사 담당자</label>
              <input style={C.input} value={form.printedBy} onChange={e => set("printedBy", e.target.value)} placeholder="이름 직접 입력" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={C.label}>전달일자</label>
                <input type="date" style={C.input} value={form.deliveredDate} onChange={e => set("deliveredDate", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={C.label}>전달 방식</label>
                <select style={{ ...C.select, width: "100%" }} value={form.deliveryMethod} onChange={e => set("deliveryMethod", e.target.value)}>
                  <option value="">선택</option>
                  {DELIVERY_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
        {/* 메모 */}
        <div style={C.frow}>
          <label style={C.label}>메모</label>
          <input style={C.input} value={form.memo} onChange={e => set("memo", e.target.value)} placeholder="특이사항" />
        </div>
        <button style={C.btn()} onClick={onSave}>{editId ? "수정 완료" : "등록"}</button>
      </div>
    </>
  );
}

/* ── 목록 ── */
function ListView({ requests, teachers, alerts, filterTeacher, setFilterTeacher, filterSubject, setFilterSubject, search, setSearch, togglePrinted, deleteReq, setForm, setEditId, setView }) {
  const [sortCol, setSortCol] = useState("requestDate");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortIcon = (col) => {
    if (sortCol !== col) return <span style={{ color: "#cbd5e1", marginLeft: 3 }}>⇅</span>;
    return <span style={{ marginLeft: 3 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const subjectsFor = (tid) => tid === "전체" ? [] : [...new Set(requests.filter(r => r.teacherId === tid && r.subject).map(r => r.subject))].sort();
  const availableSubs = subjectsFor(filterTeacher);

  const filtered = requests
    .filter(r => filterTeacher === "전체" || r.teacherId === filterTeacher)
    .filter(r => filterSubject === "전체" || r.subject === filterSubject)
    .filter(r => !search || r.title.includes(search) || r.teacherName.includes(search) || (r.subject || "").includes(search));

  // 제목 중복 체크 (검색어가 있을 때 동일 제목 건수 표시)
  const titleGroups = {};
  requests.forEach(r => {
    const k = r.title.trim();
    if (!titleGroups[k]) titleGroups[k] = 0;
    titleGroups[k]++;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortCol === "copies") {
      return sortDir === "asc" ? (Number(a.copies)||0) - (Number(b.copies)||0) : (Number(b.copies)||0) - (Number(a.copies)||0);
    }
    if (sortCol === "status") {
      const order = { "미처리": 0, "출력완료": 1, "완료": 2 };
      return sortDir === "asc" ? order[statusBadge(a).label] - order[statusBadge(b).label] : order[statusBadge(b).label] - order[statusBadge(a).label];
    }
    if (sortCol === "dueDate") {
      const ad = a.dueDate || "9999-99-99", bd = b.dueDate || "9999-99-99";
      if (ad !== bd) return sortDir === "asc" ? ad.localeCompare(bd) : bd.localeCompare(ad);
      const ac = CLASS_ORDER[a.dueClass] || 99, bc = CLASS_ORDER[b.dueClass] || 99;
      return sortDir === "asc" ? ac - bc : bc - ac;
    }
    let av = "", bv = "";
    if (sortCol === "teacherName") { av = a.teacherName; bv = b.teacherName; }
    else if (sortCol === "subject") { av = a.subject || ""; bv = b.subject || ""; }
    else if (sortCol === "requestDate") { av = `${a.requestDate||""} ${a.requestTime||""}`; bv = `${b.requestDate||""} ${b.requestTime||""}`; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const total = requests.length, done = requests.filter(r => r.printed && r.deliveredDate).length;

  const SortBtn = ({ col, label }) => (
    <button onClick={() => handleSort(col)} style={{
      background: sortCol === col ? "#eff6ff" : "transparent", color: sortCol === col ? "#1e40af" : "#64748b",
      border: `1px solid ${sortCol === col ? "#93c5fd" : "#e2e8f0"}`, borderRadius: 6, padding: "5px 10px",
      cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 2, whiteSpace: "nowrap"
    }}>{label}{sortIcon(col)}</button>
  );

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

      {/* 검색/필터 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button style={C.btn()} onClick={() => { setForm(emptyForm()); setEditId(null); setView("form"); }}>+ 새 요청</button>
        <select style={C.select} value={filterTeacher} onChange={e => { setFilterTeacher(e.target.value); setFilterSubject("전체"); }}>
          <option value="전체">전체 선생님</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <input style={{ ...C.input, paddingLeft: 32 }} placeholder="제목/강사명/과목 검색..." value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>🔍</span>
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14 }}>✕</button>}
        </div>
      </div>

      {/* 검색 결과 중복 알림 */}
      {search && filtered.length > 1 && (
        <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#92400e" }}>
          🔍 <strong>"{search}"</strong> 검색 결과 {filtered.length}건 — 동일/유사 요청이 있는지 확인하세요!
        </div>
      )}

      {filterTeacher !== "전체" && availableSubs.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {["전체", ...availableSubs].map(sub => (
            <button key={sub} onClick={() => setFilterSubject(sub)} style={{ background: filterSubject === sub ? "#7c3aed" : "#fff", color: filterSubject === sub ? "#fff" : "#7c3aed", border: "1px solid #7c3aed", borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {sub === "전체" ? "전체 과목" : sub}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#94a3b8", marginRight: 2 }}>정렬:</span>
        <SortBtn col="teacherName" label="강사명" />
        <SortBtn col="subject" label="과목" />
        <SortBtn col="requestDate" label="신청일시" />
        <SortBtn col="dueDate" label="요청마감일" />
        <SortBtn col="status" label="상태" />
        <SortBtn col="copies" label="부수" />
      </div>

      <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>총 {sortedFiltered.length}건</p>

      {sortedFiltered.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>
            {search ? `"${search}" 검색 결과가 없습니다` : "등록된 요청이 없습니다"}
          </div>
        : sortedFiltered.map(item => {
          const st = statusBadge(item);
          const completed = item.printed && item.deliveredDate;
          const dDiff = item.dueDate ? diffDays(today(), item.dueDate) : null;
          const sheets = calcSheets(item.pages, item.copies, item.isDuplex);
          const counter = calcCounter(item.pages, item.copies);
          const dupCount = titleGroups[item.title.trim()] || 0;
          return (
            <div key={item.id} style={{ background: completed ? "#f8fafc" : "#fff", borderRadius: 12, padding: 14, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `4px solid ${completed ? "#22c55e" : "#f59e0b"}`, opacity: completed ? 0.78 : 1 }}>
              <div>
                <span style={C.badge(st.color)}>{st.label}</span>
                {item.subject && <span style={{ display: "inline-block", background: "#ede9fe", color: "#7c3aed", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>{item.subject}</span>}
                {item.paperSize && <span style={{ display: "inline-block", background: "#f0fdf4", color: "#16a34a", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>{item.paperSize}</span>}
                {dupCount > 1 && <span style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>⚠️ 동일제목 {dupCount}건</span>}
                {!completed && dDiff !== null && dDiff <= 1 && <span style={C.badge("#ef4444")}>{dDiff === 0 ? "오늘마감" : "내일마감"}</span>}
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginTop: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{item.teacherName} 선생님{item.subject ? ` · ${item.subject}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>📅 {formatDate(item.requestDate)} {item.requestTime}</span>
                {item.dueDate && (
                  <span style={{ fontSize: 12, color: dDiff !== null && dDiff <= 1 && !completed ? "#ef4444" : "#64748b" }}>
                    ⏰ {formatDate(item.dueDate)}{getDayLabel(item.dueDate)}{item.dueClass ? ` ${item.dueClass}` : ""}
                  </span>
                )}
                {item.pages && item.copies && (
                  <span style={{ fontSize: 12, color: "#1e40af", fontWeight: 600 }}>
                    📄 {item.isDuplex ? "양면" : "단면"} {item.pages}p × {Number(item.copies).toLocaleString()}부 → 용지 {sheets.toLocaleString()} / 카운터 {counter.toLocaleString()}
                  </span>
                )}
                {item.receiver && <span style={{ fontSize: 12, color: "#64748b" }}>👤 {item.receiver}</span>}
                {item.printedBy && <span style={{ fontSize: 12, color: "#64748b" }}>🖨️ {item.printedBy}</span>}
                {item.deliveredDate && <span style={{ fontSize: 12, color: "#64748b" }}>✅ {formatDate(item.deliveredDate)}{item.deliveryMethod ? ` (${item.deliveryMethod})` : ""}</span>}
                {item.memo && <span style={{ fontSize: 12, color: "#94a3b8" }}>💬 {item.memo}</span>}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button style={C.btnOutSm(item.printed ? "#22c55e" : "#f59e0b")} onClick={() => togglePrinted(item)}>
                  {item.printed ? "✓ 출력완료" : "출력전"}
                </button>
                <button style={C.btnOutSm("#3b82f6")} onClick={() => { setForm({ ...item }); setEditId(item.id); setView("form"); }}>수정</button>
                <button style={C.btnOutSm("#ef4444")} onClick={async () => { if (!confirm("삭제하시겠습니까?")) return; await deleteReq(item.id); }}>삭제</button>
              </div>
            </div>
          );
        })}
    </>
  );
}

/* ── 일별 통계 탭 ── */
function DailyStatsTab({ requests, copierCounters, onSaveCounter, onSaveAllCounters }) {
  const [subTab, setSubTab] = useState("input"); // "input" | "monthly"
  const [date, setDate] = useState(today());
  const [inputs, setInputs] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });
  const [startInputs, setStartInputs] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });
  const [memoInputs, setMemoInputs] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [monthView, setMonthView] = useState(today().slice(0, 7)); // YYYY-MM

  const getC = (no, d = date) => copierCounters.find(c => c.machine_no === no && c.record_date === d);
  const getPrevC = (no, d = date) => {
    const prev = getPrevDate(d);
    return copierCounters.find(c => c.machine_no === no && c.record_date === prev);
  };

  useEffect(() => {
    const newInputs = {}, newStart = {}, newMemo = {};
    [1, 2, 3, 4, 5].forEach(no => {
      const c = getC(no);
      newInputs[no] = c ? String(c.counter_value) : "";
      newStart[no] = c && c.start_counter != null ? String(c.start_counter) : "";
      newMemo[no] = c && c.memo ? c.memo : "";
    });
    setInputs(newInputs);
    setStartInputs(newStart);
    setMemoInputs(newMemo);
  }, [date, copierCounters]);

  // 실제 사용량 계산 (시작카운터 있으면 우선, 없으면 전일카운터 사용)
  const getActualStart = (no) => {
    const c = getC(no);
    if (c && c.start_counter != null) return c.start_counter;
    const p = getPrevC(no);
    return p ? p.counter_value : null;
  };

  // 전체 저장
  const handleSaveAll = async () => {
    const toSave = [1, 2, 3, 4, 5].filter(no => inputs[no] !== "");
    if (toSave.length === 0) { alert("입력된 카운터가 없습니다."); return; }
    setSaving(true);
    await onSaveAllCounters(date, inputs, startInputs, memoInputs);
    setSaving(false);
    setSavedMsg(`✅ ${toSave.length}개 저장 완료!`);
    setTimeout(() => setSavedMsg(""), 3000);
  };

  const dayReqs = requests.filter(r => r.requestDate === date && r.printed);
  const totalExpectedCounter = dayReqs.reduce((s, r) => s + calcCounter(r.pages, r.copies), 0);
  const totalSheets = dayReqs.reduce((s, r) => s + calcSheets(r.pages, r.copies, r.isDuplex), 0);
  const machine123Diff = [1, 2, 3].reduce((s, no) => {
    const c = getC(no), p = getPrevC(no);
    return s + (c && p ? c.counter_value - p.counter_value : 0);
  }, 0);
  const waste123 = machine123Diff > 0 ? machine123Diff - totalExpectedCounter : null;

  // 월별 데이터 생성
  const getDaysInMonth = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  };
  const monthDays = Array.from({ length: getDaysInMonth(monthView) }, (_, i) => {
    const d = `${monthView}-${String(i + 1).padStart(2, "0")}`;
    return d;
  });

  const thStyle = { padding: "7px 8px", background: "#1e40af", color: "#fff", fontSize: 11, textAlign: "center", whiteSpace: "nowrap", borderRight: "1px solid #3b82f6" };
  const tdStyle = (align = "center", bold = false, color = "#374151", bg = "#fff") => ({
    padding: "6px 8px", fontSize: 11, textAlign: align, borderBottom: "1px solid #f1f5f9",
    borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", fontWeight: bold ? 700 : 400, color, background: bg
  });

  return (
    <>
      {/* 서브 탭 */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
        <button style={C.tab(subTab === "input")} onClick={() => setSubTab("input")}>📅 일별 카운터 입력</button>
        <button style={C.tab(subTab === "monthly")} onClick={() => setSubTab("monthly")}>📊 월별 현황</button>
      </div>

      {/* ─── 일별 입력 ─── */}
      {subTab === "input" && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>📈 일별 통계</span>
            <input type="date" style={{ ...C.input, width: 160 }} value={date} onChange={e => setDate(e.target.value)} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1e40af" }}>{getDayLabel(date)}</span>
          </div>

          {/* 1~3기 요약 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>🖨️ 1~3기 복사기 집계 (요청 기준)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {[
                ["출력 건수", dayReqs.length + "건", "#dbeafe"],
                ["총 용지매수", totalSheets.toLocaleString() + "매", "#dcfce7"],
                ["예상 카운터", totalExpectedCounter.toLocaleString(), "#fef9c3"],
                ["실제 카운터(1~3기)", machine123Diff > 0 ? machine123Diff.toLocaleString() : "-", "#ede9fe"],
                ["파본 추정", waste123 !== null ? waste123.toLocaleString() : "-", waste123 > 0 ? "#fee2e2" : "#f0fdf4"],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: c, borderRadius: 10, padding: "10px 14px", flex: 1, minWidth: 80, textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{v}</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            {dayReqs.length > 0 && (
              <div style={{ ...C.card, padding: 0, overflowX: "auto", marginBottom: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr>{["선생님","과목","제목","규격","인쇄","페이지","요청부수","용지매수","예상카운터"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {dayReqs.map(r => {
                      const sh = calcSheets(r.pages, r.copies, r.isDuplex);
                      const ct = calcCounter(r.pages, r.copies);
                      return (
                        <tr key={r.id}>
                          <td style={tdStyle("left")}>{r.teacherName}</td>
                          <td style={tdStyle()}>{r.subject || "-"}</td>
                          <td style={{ ...tdStyle("left"), maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</td>
                          <td style={tdStyle()}>{r.paperSize || "-"}</td>
                          <td style={tdStyle()}>{r.isDuplex ? "양면" : "단면"}</td>
                          <td style={tdStyle()}>{r.pages || "-"}</td>
                          <td style={tdStyle()}>{r.copies ? Number(r.copies).toLocaleString() : "-"}</td>
                          <td style={tdStyle("center", true, "#1e40af")}>{sh ? sh.toLocaleString() : "-"}</td>
                          <td style={tdStyle("center", false, "#7c3aed")}>{ct ? ct.toLocaleString() : "-"}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: "#f8fafc" }}>
                      <td colSpan={7} style={tdStyle("center", true)}>합 계</td>
                      <td style={tdStyle("center", true, "#1e40af")}>{totalSheets.toLocaleString()}</td>
                      <td style={tdStyle("center", true, "#7c3aed")}>{totalExpectedCounter.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 복사기 카운터 일괄 입력 */}
          <div style={{ ...C.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>📊 복사기 퇴근 카운터 입력 (1~5기)</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>입력 후 전체 저장 버튼을 한번만 누르세요</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {savedMsg && <span style={{ color: "#059669", fontWeight: 700, fontSize: 13 }}>{savedMsg}</span>}
                <button style={{ ...C.btn(saving ? "#94a3b8" : "#059669"), fontSize: 14, padding: "10px 20px" }}
                  onClick={handleSaveAll} disabled={saving}>
                  {saving ? "저장 중..." : "💾 전체 저장"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {[1, 2, 3, 4, 5].map(no => {
                const c = getC(no);
                const p = getPrevC(no);
                const actualStart = getActualStart(no);
                const savedDiff = c && actualStart != null ? c.counter_value - actualStart : null;
                const previewEnd = inputs[no] !== "" ? Number(inputs[no]) : null;
                const previewStart = startInputs[no] !== "" ? Number(startInputs[no]) : actualStart;
                const previewDiff = previewEnd !== null && previewStart !== null ? previewEnd - previewStart : null;
                const isRequest = no <= 3;
                const isReplaced = c && c.start_counter != null;
                return (
                  <div key={no} style={{ background: isRequest ? "#eff6ff" : "#f8fafc", borderRadius: 10, padding: 12, border: `1px solid ${isRequest ? "#bfdbfe" : "#e2e8f0"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{no}기</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {isReplaced && <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "1px 5px" }}>교체</span>}
                        <span style={{ fontSize: 10, background: isRequest ? "#dbeafe" : "#f1f5f9", color: isRequest ? "#1e40af" : "#64748b", borderRadius: 4, padding: "1px 5px" }}>
                          {isRequest ? "요청용" : "전용"}
                        </span>
                      </div>
                    </div>

                    {/* 전일/시작 카운터 */}
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>
                      {isReplaced ? "시작 카운터 (교체)" : "전일 카운터 (자동)"}
                    </div>
                    <div style={{ fontWeight: 600, color: isReplaced ? "#92400e" : "#374151", background: isReplaced ? "#fef3c7" : "#fff", borderRadius: 6, padding: "5px 8px", fontSize: 12, marginBottom: 6, textAlign: "center" }}>
                      {actualStart != null ? actualStart.toLocaleString() : "미입력"}
                    </div>

                    {/* 교체 시 시작카운터 직접 입력 */}
                    <div style={{ fontSize: 10, color: "#f59e0b", marginBottom: 2 }}>시작 카운터 (교체시만 입력)</div>
                    <input type="number" style={{ ...C.input, fontSize: 11, padding: "5px 8px", marginBottom: 6, background: startInputs[no] ? "#fef3c7" : "#fff" }}
                      value={startInputs[no]}
                      onChange={e => setStartInputs(prev => ({ ...prev, [no]: e.target.value }))}
                      placeholder="교체시만 입력" />

                    {/* 오늘 카운터 */}
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>오늘 카운터 *</div>
                    <input type="number" style={{ ...C.input, fontSize: 12, padding: "6px 8px", marginBottom: 6 }}
                      value={inputs[no]}
                      onChange={e => setInputs(prev => ({ ...prev, [no]: e.target.value }))}
                      placeholder="퇴근 카운터" />

                    {/* 비고 */}
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>비고</div>
                    <input type="text" style={{ ...C.input, fontSize: 11, padding: "5px 8px", marginBottom: 6 }}
                      value={memoInputs[no]}
                      onChange={e => setMemoInputs(prev => ({ ...prev, [no]: e.target.value }))}
                      placeholder="교체, 고장 등" />

                    {/* 사용량 미리보기 */}
                    {previewDiff !== null && (
                      <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>{previewDiff.toLocaleString()}</div>
                        <div style={{ fontSize: 9, color: "#6b7280" }}>예상 사용량</div>
                      </div>
                    )}
                    {savedDiff !== null && inputs[no] === "" && (
                      <div style={{ background: "#dbeafe", borderRadius: 6, padding: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>{savedDiff.toLocaleString()}</div>
                        <div style={{ fontSize: 9, color: "#3b82f6" }}>저장된 사용량</div>
                      </div>
                    )}
                    {c && c.memo && inputs[no] === "" && (
                      <div style={{ marginTop: 4, background: "#fef3c7", borderRadius: 6, padding: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#92400e" }}>📝 {c.memo}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ─── 월별 현황 ─── */}
      {subTab === "monthly" && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>📊 월별 카운터 현황</span>
            <input type="month" style={{ ...C.input, width: 160 }} value={monthView} onChange={e => setMonthView(e.target.value)} />
          </div>

          <div style={{ ...C.card, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, background: "#0f172a" }}>날짜</th>
                  <th style={{ ...thStyle, background: "#0f172a" }}>요일</th>
                  {[1, 2, 3, 4, 5].map(no => (
                    <th key={no} colSpan={2} style={{ ...thStyle, background: no <= 3 ? "#1e40af" : "#374151", borderRight: "2px solid #fff" }}>
                      {no}기 {no <= 3 ? "(요청용)" : "(전용)"}
                    </th>
                  ))}
                  <th style={{ ...thStyle, background: "#059669" }}>1~3기 합계</th>
                  <th style={{ ...thStyle, background: "#7c3aed" }}>파본 추정</th>
                  <th style={{ ...thStyle, background: "#92400e" }}>비고</th>
                </tr>
                <tr>
                  <th style={{ ...thStyle, background: "#1e293b", fontSize: 10 }}></th>
                  <th style={{ ...thStyle, background: "#1e293b", fontSize: 10 }}></th>
                  {[1, 2, 3, 4, 5].map(no => (
                    [<th key={`${no}c`} style={{ ...thStyle, background: no <= 3 ? "#1e3a8a" : "#475569", fontSize: 10 }}>카운터</th>,
                     <th key={`${no}d`} style={{ ...thStyle, background: no <= 3 ? "#1e3a8a" : "#475569", fontSize: 10, borderRight: "2px solid #94a3b8" }}>사용량</th>]
                  ))}
                  <th style={{ ...thStyle, background: "#047857", fontSize: 10 }}>사용량</th>
                  <th style={{ ...thStyle, background: "#6d28d9", fontSize: 10 }}>수량</th>
                </tr>
              </thead>
              <tbody>
                {monthDays.map((d, idx) => {
                  const dayOfWeek = DAYS[new Date(d + "T00:00:00").getDay()];
                  const isWeekend = dayOfWeek === "토" || dayOfWeek === "일";
                  const rowBg = isWeekend ? "#fafafa" : "#fff";

                  const machineData = [1, 2, 3, 4, 5].map(no => {
                    const c = getC(no, d);
                    const p = getPrevC(no, d);
                    const startC = c && c.start_counter != null ? c.start_counter : (p ? p.counter_value : null);
                    const diff = c && startC != null ? c.counter_value - startC : null;
                    return { counter: c ? c.counter_value : null, diff, isReplaced: c && c.start_counter != null, memo: c ? c.memo : null };
                  });

                  const sum123 = machineData.slice(0, 3).reduce((s, m) => s + (m.diff || 0), 0);
                  const dayReqsForDate = requests.filter(r => r.requestDate === d && r.printed);
                  const expectedForDate = dayReqsForDate.reduce((s, r) => s + calcCounter(r.pages, r.copies), 0);
                  const waste = sum123 > 0 ? sum123 - expectedForDate : null;
                  const hasData = machineData.some(m => m.counter !== null);

                  return (
                    <tr key={d} style={{ background: rowBg, opacity: isWeekend ? 0.7 : 1 }}>
                      <td style={tdStyle("center", false, "#374151", rowBg)}>{d.slice(5)}</td>
                      <td style={tdStyle("center", true, isWeekend ? "#dc2626" : "#374151", rowBg)}>{dayOfWeek}</td>
                      {machineData.map((m, i) => {
                        const no = i + 1;
                        const isReq = no <= 3;
                        return [
                          <td key={`${no}c`} style={tdStyle("right", false, m.counter ? "#374151" : "#d1d5db", rowBg)}>
                            {m.counter !== null ? m.counter.toLocaleString() : "-"}
                          </td>,
                          <td key={`${no}d`} style={{ ...tdStyle("right", m.diff > 0, isReq ? "#1e40af" : "#059669", rowBg), borderRight: "2px solid #e2e8f0" }}>
                            {m.diff !== null ? m.diff.toLocaleString() : "-"}
                          </td>
                        ];
                      })}
                      <td style={tdStyle("right", sum123 > 0, "#059669", rowBg)}>
                        {sum123 > 0 ? sum123.toLocaleString() : "-"}
                      </td>
                      <td style={tdStyle("right", waste > 0, waste > 0 ? "#dc2626" : "#6b7280", rowBg)}>
                        {waste !== null ? waste.toLocaleString() : "-"}
                      </td>
                      <td style={tdStyle("left", false, "#92400e", rowBg)} title={machineData.map((m,i) => m.memo ? `${i+1}기:${m.memo}` : "").filter(Boolean).join(" / ")}>
                        {machineData.some(m => m.isReplaced) && <span style={{ background: "#fef3c7", borderRadius: 4, padding: "1px 5px", fontSize: 10, marginRight: 4 }}>🔄교체</span>}
                        {machineData.map((m,i) => m.memo ? `${i+1}기:${m.memo}` : "").filter(Boolean).join(" ")}
                      </td>
                    </tr>
                  );
                })}
                {/* 합계 행 */}
                <tr style={{ background: "#1e3a8a" }}>
                  <td colSpan={2} style={{ ...tdStyle("center", true, "#fff", "#1e3a8a") }}>합 계</td>
                  {[1, 2, 3, 4, 5].map(no => {
                    const total = monthDays.reduce((s, d) => {
                      const c = getC(no, d), p = getPrevC(no, d);
                      return s + (c && p ? c.counter_value - p.counter_value : 0);
                    }, 0);
                    return [
                      <td key={`${no}c`} style={tdStyle("right", false, "#94a3b8", "#1e3a8a")}></td>,
                      <td key={`${no}d`} style={{ ...tdStyle("right", true, "#fff", "#1e3a8a"), borderRight: "2px solid #475569" }}>
                        {total > 0 ? total.toLocaleString() : "-"}
                      </td>
                    ];
                  })}
                  <td style={tdStyle("right", true, "#6ee7b7", "#1e3a8a")}>
                    {monthDays.reduce((s, d) => {
                      return s + [1,2,3].reduce((ss, no) => {
                        const c = getC(no, d), p = getPrevC(no, d);
                        return ss + (c && p ? c.counter_value - p.counter_value : 0);
                      }, 0);
                    }, 0).toLocaleString()}
                  </td>
                  <td style={tdStyle("right", true, "#fca5a5", "#1e3a8a")}>-</td>
                  <td style={tdStyle("left", false, "#94a3b8", "#1e3a8a")}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ── 대시보드 ── */
function Dashboard({ requests, teachers, selYear, setSelYear, teacherSearch, setTeacherSearch, onTeacherClick }) {
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
          const bg = ti % 2 === 0 ? "#fff" : "#f8fafc";
          return (
            <div key={t.id}>
              <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ ...cell(80, false, bg, true, "#1d4ed8"), fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => onTeacherClick(t.id)}>{t.name}</div>
                <div style={{ ...cell(52, true, bg, false, "#64748b"), fontSize: 10 }}>신청건수</div>
                {tMonths.map((m, i) => <div key={i} style={{ ...cell(46, true, bg, m.count > 0, m.count > 0 ? "#1d4ed8" : "#94a3b8") }}>{m.count || ""}</div>)}
                <div style={{ ...cell(52, true, bg, true, "#1e293b"), borderRight: "none" }}>{tReqs.length || 0}</div>
              </div>
              <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0" }}>
                <div style={{ ...cell(80, false, bg, false, "#94a3b8") }}></div>
                <div style={{ ...cell(52, true, bg, false, "#64748b"), fontSize: 10 }}>총부수</div>
                {tMonths.map((m, i) => <div key={i} style={{ ...cell(46, true, bg, false, m.copies > 0 ? "#7c3aed" : "#94a3b8") }}>{m.copies ? m.copies.toLocaleString() : ""}</div>)}
                <div style={{ ...cell(52, true, bg, true, "#7c3aed"), borderRight: "none" }}>{tReqs.reduce((s, r) => s + (Number(r.copies) || 0), 0).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
        {filteredT.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>선생님이 없습니다</div>}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, textAlign: "center" }}>선생님 이름 클릭 시 해당 요청 목록으로 이동</div>
    </>
  );
}

/* ── 관리자 뷰 ── */
function AdminView({ teachers, requests, addTeacher, updateTeacher, deleteTeacher, bulkAddTeachers, bulkDeleteRequests, setView }) {
  const [adminTab, setAdminTab] = useState("teachers");
  const [teacherForm, setTeacherForm] = useState({ name: "" });
  const [editTeacherId, setEditTeacherId] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [deleteFrom, setDeleteFrom] = useState("");
  const [deleteTo, setDeleteTo] = useState("");
  const filteredT = teachers.filter(t => !teacherSearch || t.name.includes(teacherSearch));
  const handleTeacherSave = async () => {
    const name = teacherForm.name.trim(); if (!name) return;
    if (editTeacherId) { await updateTeacher(editTeacherId, name); setEditTeacherId(null); }
    else { if (teachers.some(t => t.name === name)) { alert("이미 등록된 이름입니다."); return; } await addTeacher(name); }
    setTeacherForm({ name: "" });
  };
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
            <input style={{ ...C.input, flex: 1 }} value={teacherForm.name} onChange={e => setTeacherForm({ name: e.target.value })}
              placeholder="선생님 이름" onKeyDown={e => { if (e.key === "Enter") handleTeacherSave(); }} />
            <button style={C.btn(editTeacherId ? "#059669" : "#1e40af")} onClick={handleTeacherSave}>{editTeacherId ? "수정완료" : "등록"}</button>
            {editTeacherId && <button style={C.btn("#94a3b8")} onClick={() => { setEditTeacherId(null); setTeacherForm({ name: "" }); }}>취소</button>}
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px dashed #cbd5e1" }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>📂 엑셀로 일괄 등록</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>A열에 선생님 이름 · 헤더/중복 자동 제외</div>
            <ExcelUploader teachers={teachers} onBulkAdd={bulkAddTeachers} />
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
                  <button style={C.btnOutSm("#ef4444")} onClick={async () => { if (!confirm(`"${t.name}" 선생님을 삭제하시겠습니까?`)) return; await deleteTeacher(t.id); }}>삭제</button>
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
          <button style={C.btn("#ef4444")} onClick={async () => {
            if (!deleteFrom || !deleteTo) { alert("날짜를 모두 선택해주세요."); return; }
            if (deleteFrom > deleteTo) { alert("시작일이 종료일보다 늦습니다."); return; }
            const cnt = requests.filter(r => r.requestDate >= deleteFrom && r.requestDate <= deleteTo).length;
            if (cnt === 0) { alert("해당 기간에 삭제할 요청이 없습니다."); return; }
            if (!confirm(`${deleteFrom.replace(/-/g, ".")} ~ ${deleteTo.replace(/-/g, ".")} 기간의 요청 ${cnt}건을 삭제하시겠습니까?\n복구가 불가능합니다.`)) return;
            await bulkDeleteRequests(deleteFrom, deleteTo);
            setDeleteFrom(""); setDeleteTo(""); alert("삭제 완료");
          }}>삭제 실행</button>
        </div>
      )}
    </>
  );
}

/* ── 메인 앱 ── */
export default function App() {
  const [role, setRole] = useState(null);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [requests, setRequests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [copierCounters, setCopierCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [filterTeacher, setFilterTeacher] = useState("전체");
  const [filterSubject, setFilterSubject] = useState("전체");
  const [search, setSearch] = useState("");
  const [selYear, setSelYear] = useState(new Date().getFullYear().toString());
  const [teacherSearch, setTeacherSearch] = useState("");

  const loadTeachers = useCallback(async () => {
    const { data } = await supabase.from("teachers").select("*").order("name");
    if (data) setTeachers(data);
  }, []);
  const loadRequests = useCallback(async () => {
    const { data } = await supabase.from("copy_requests").select("*").order("request_date", { ascending: false });
    if (data) setRequests(data.map(fromSupabase));
  }, []);
  const loadCopierCounters = useCallback(async () => {
    const { data } = await supabase.from("copier_counters").select("*").order("record_date", { ascending: false });
    if (data) setCopierCounters(data);
  }, []);

  useEffect(() => {
    if (role) {
      setLoading(true);
      Promise.all([loadTeachers(), loadRequests(), loadCopierCounters()]).finally(() => setLoading(false));
    }
  }, [role, loadTeachers, loadRequests, loadCopierCounters]);

  const addTeacher = async (name) => { await supabase.from("teachers").insert({ name }); await loadTeachers(); };
  const updateTeacher = async (id, name) => { await supabase.from("teachers").update({ name }).eq("id", id); await loadTeachers(); };
  const deleteTeacher = async (id) => { await supabase.from("teachers").delete().eq("id", id); await loadTeachers(); };
  const bulkAddTeachers = async (names) => { if (!names.length) return; await supabase.from("teachers").insert(names.map(name => ({ name }))); await loadTeachers(); };
  const saveReqItem = async (item) => {
    const payload = toSupabase(item);
    if (item.id) await supabase.from("copy_requests").update(payload).eq("id", item.id);
    else await supabase.from("copy_requests").insert(payload);
    await loadRequests();
  };
  const deleteReq = async (id) => { await supabase.from("copy_requests").delete().eq("id", id); await loadRequests(); };
  const togglePrinted = async (item) => { await supabase.from("copy_requests").update({ is_printed: !item.printed }).eq("id", item.id); await loadRequests(); };
  const bulkDeleteRequests = async (from, to) => { await supabase.from("copy_requests").delete().gte("request_date", from).lte("request_date", to); await loadRequests(); };
  const saveCopierCounter = async (machineNo, date, value) => {
    await supabase.from("copier_counters").upsert({ machine_no: machineNo, record_date: date, counter_value: value }, { onConflict: "machine_no,record_date" });
    await loadCopierCounters();
  };
  const saveAllCopierCounters = async (date, inputs, startInputs, memoInputs) => {
    const rows = [1, 2, 3, 4, 5]
      .filter(no => inputs[no] !== "")
      .map(no => ({
        machine_no: no,
        record_date: date,
        counter_value: Number(inputs[no]),
        start_counter: startInputs && startInputs[no] !== "" ? Number(startInputs[no]) : null,
        memo: memoInputs && memoInputs[no] ? memoInputs[no] : null,
      }));
    if (rows.length > 0) {
      await supabase.from("copier_counters").upsert(rows, { onConflict: "machine_no,record_date" });
      await loadCopierCounters();
    }
  };

  const handleSave = async () => {
    if (!form.teacherId || !form.title || !form.requestDate) { alert("선생님, 제목, 신청일시는 필수입니다."); return; }
    await saveReqItem(editId ? { ...form, id: editId } : form);
    setForm(emptyForm()); setEditId(null); setView("list");
  };

  const alerts = requests.filter(r => {
    if (r.printed && r.deliveredDate) return false;
    if (!r.dueDate) return false;
    return diffDays(today(), r.dueDate) >= 0 && diffDays(today(), r.dueDate) <= 1;
  });

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

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 16 }}>⏳ 데이터 불러오는 중...</div>;

  const navItems = [
    { key: "dashboard", label: "📊 현황" },
    { key: "list", label: "📋 목록" },
    { key: "daily", label: "📈 일별통계" },
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
              • {a.teacherName}{a.subject ? ` [${a.subject}]` : ""} | {a.title} — {formatDate(a.dueDate)}{getDayLabel(a.dueDate)}{a.dueClass ? ` ${a.dueClass}` : ""}
              {diffDays(today(), a.dueDate) === 0 ? " 🔴 오늘까지!" : " 🟡 내일까지!"}
            </div>
          ))}
        </div>
      )}
      <div style={C.body}>
        {view === "dashboard" && <Dashboard requests={requests} teachers={teachers} selYear={selYear} setSelYear={setSelYear} teacherSearch={teacherSearch} setTeacherSearch={setTeacherSearch} onTeacherClick={(id) => { setFilterTeacher(id); setFilterSubject("전체"); setView("list"); }} />}
        {view === "list" && <ListView requests={requests} teachers={teachers} alerts={alerts} filterTeacher={filterTeacher} setFilterTeacher={setFilterTeacher} filterSubject={filterSubject} setFilterSubject={setFilterSubject} search={search} setSearch={setSearch} togglePrinted={togglePrinted} deleteReq={deleteReq} setForm={setForm} setEditId={setEditId} setView={setView} />}
        {view === "daily" && <DailyStatsTab requests={requests} copierCounters={copierCounters} onSaveCounter={saveCopierCounter} onSaveAllCounters={saveAllCopierCounters} />}
        {view === "form" && <FormView teachers={teachers} form={form} setForm={setForm} editId={editId} onSave={handleSave} allRequests={requests} onCancel={() => { setView("list"); setEditId(null); setForm(emptyForm()); }} />}
        {view === "admin" && role === "admin" && <AdminView teachers={teachers} requests={requests} addTeacher={addTeacher} updateTeacher={updateTeacher} deleteTeacher={deleteTeacher} bulkAddTeachers={bulkAddTeachers} bulkDeleteRequests={bulkDeleteRequests} setView={setView} />}
      </div>
    </div>
  );
}
