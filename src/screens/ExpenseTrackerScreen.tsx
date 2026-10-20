import React, { useState } from "react";
import { Expense, ExpenseTotal } from "../types";
import {
  listExpenses,
  createExpense,
  deleteExpense,
  totalExpensesRupees
} from "../lib/api";

interface ExpenseTrackerScreenProps {
  onBack?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  medicine: "Medicine",
  travel: "Travel",
  other: "Other",
};

const TYPE_GRID: [string, string][] = [
  ["consultation", "Consultation"],
  ["medicine", "Medicine"],
  ["travel", "Travel"],
  ["other", "Other"],
];

export const ExpenseTrackerScreen: React.FC<ExpenseTrackerScreenProps> = ({
  onBack
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<ExpenseTotal>({ total_rupees: 0 });
  const [filterType, setFilterType] = useState<"all" | "consultation" | "medicine" | "travel" | "other">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add expense form
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [type, setType] = useState<"consultation" | "medicine" | "travel" | "other">("consultation");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [e, t] = await Promise.all([
        listExpenses(filterType === "all" ? undefined : filterType),
        totalExpensesRupees(filterType === "all" ? undefined : filterType),
      ]);
      setExpenses(e);
      setTotal(t);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim() || parseFloat(amount) <= 0) {
      setError("Enter a valid amount in rupees");
      return;
    }
    try {
      await createExpense({
        patient_id: patientId.trim() || null,
        appointment_id: appointmentId.trim() || null,
        type,
        amount_rupees: parseFloat(amount),
        description: description.trim() || null,
        date,
      });
      setPatientId("");
      setAppointmentId("");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this expense record?")) return;
    try {
      await deleteExpense(id);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense");
    }
  };

  const typeTotal = (t: string) =>
    expenses
      .filter((e) => e.type === t)
      .reduce((sum, e) => sum + e.amount_rupees, 0);

  return (
    <div className="flex flex-col w-full gap-4 pb-28 screen-layout">
      <div className="lg-span-2 bg-white p-4 rounded-xl shadow-sm border border-[#e6eeff]/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-headline-md text-[20px] text-[#121c2a] font-bold">
              Expense Tracker (₹)
            </h2>
            <p className="font-label-sm text-[12px] text-[#574238]">
              Track consultation, medicine, travel and other costs
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 bg-[#f1f5f9] text-[#475569] rounded-xl text-[12px] font-bold hover:bg-[#e2e8f0]"
            >
              Back
            </button>
          )}
        </div>

        {/* Total rupees card */}
        <div className="bg-[#0f5257] p-3.5 rounded-xl text-white mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#8ff3f4] font-semibold uppercase tracking-wider">
              Total spent
            </span>
            <span className="text-[24px] font-bold">₹{total.total_rupees}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {TYPE_GRID.map(([key, label]) => (
              <div key={key} className="bg-white/10 p-2 rounded-lg text-[11px] text-center">
                <div className="text-[13px] font-bold">{typeTotal(key)}</div>
                <div className="text-[10px] opacity-80">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          {["all", "consultation", "medicine", "travel", "other"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f as any)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filterType === f
                  ? "bg-[#00696b] text-white shadow-sm"
                  : "bg-[#eff4ff] text-[#574238] hover:bg-[#dee9fc]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading && <p className="text-[12px] text-[#64748b]">Loading...</p>}
        {error && <p className="text-[11px] text-[#dc2626] font-medium mb-2">{error}</p>}

        {/* Expense list */}
        <div className="space-y-2">
          {expenses.length === 0 && (
            <div className="bg-[#f8fafc] p-4 rounded-xl text-center border border-[#d9e3f6]">
              <span className="material-symbols-outlined text-[40px] text-[#9ca3af] mb-2">
                paypal
              </span>
              <p className="text-[13px] text-[#475569]">No expense records yet</p>
            </div>
          )}
          {expenses.map((e) => (
            <div
              key={e.id}
              className="bg-white p-3 rounded-xl shadow-sm border border-[#e6eeff]/60 flex items-start justify-between gap-3 mb-2"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#fffbeb] flex-shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#92400e] text-[20px]">
                    paypal
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-sm text-[15px] text-[#121c2a] font-bold">
                      {TYPE_LABELS[e.type]}
                    </h3>
                    <span className="text-[11px] font-bold text-[#0f5257]">₹{e.amount_rupees}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#475569]">
                    <span>{e.date}</span>
                    {e.patient_id && <span>• Patient: {e.patient_id.slice(0, 8)}</span>}
                    {e.appointment_id && <span>• Appt: {e.appointment_id.slice(0, 8)}</span>}
                  </div>
                  {e.description && (
                    <p className="text-[12px] text-[#574238] mt-0.5">{e.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(e.id)}
                type="button"
                className="w-7 h-7 rounded-lg bg-[#fecaca] text-[#ba1a1a] flex items-center justify-center hover:bg-[#fca5a5] active:scale-95 transition-all"
                aria-label={`Delete expense ₹${e.amount_rupees}`}
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add expense form */}
      <div className="lg-span-2 bg-[#f8fafc] p-4 rounded-xl shadow-sm border border-[#e6eeff]/60">
        <h3 className="font-headline-sm text-[15px] text-[#121c2a] font-bold mb-3">
          Add expense (₹)
        </h3>
        <form onSubmit={handleAdd} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
              >
                <option value="consultation">Consultation</option>
                <option value="medicine">Medicine</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                Amount (₹) <span className="text-[#dc2626]">*</span>
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Patient ID (optional)</label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Patient ID"
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Appointment ID (optional)</label>
            <input
              type="text"
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              placeholder="Appointment ID"
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Consultation with Dr. Sharma"
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
            />
          </div>
          {error && <p className="text-[11px] text-[#dc2626] font-medium">{error}</p>}
          <button
            type="submit"
            className="w-full h-10 rounded-lg bg-[#0f5257] text-white font-bold text-[13px] shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
          >
            Add Expense
          </button>
        </form>
      </div>
    </div>
  );
};
