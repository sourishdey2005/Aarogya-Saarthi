import React, { useState } from "react";
import { Doctor, Appointment } from "../types";
import { listDoctors, createDoctor, deleteDoctor, listAppointments, createAppointment, updateAppointmentStatus } from "../lib/api";

interface DoctorAppointmentScreenProps {
  onBack?: () => void;
}

export const DoctorAppointmentScreen: React.FC<DoctorAppointmentScreenProps> = ({
  onBack
}) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState<"doctors" | "appointments">("doctors");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add doctor form
  const [docName, setDocName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [fee, setFee] = useState("");
  const [availableDays, setAvailableDays] = useState("");
  const [availableTimes, setAvailableTimes] = useState("");
  const [hospitalId, setHospitalId] = useState("");

  // Book appointment form
  const [patientId, setPatientId] = useState("");
  const [doctorSelection, setDoctorSelection] = useState("");
  const [hospitalSelection, setHospitalSelection] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, a] = await Promise.all([listDoctors(), listAppointments()]);
      setDoctors(d);
      setAppointments(a);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !specialization.trim()) {
      setError("Doctor name and specialization are required");
      return;
    }
    try {
      await createDoctor({
        name: docName.trim(),
        specialization: specialization.trim(),
        phone: docPhone.trim() || null,
        consultation_fee_rupees: fee.trim() ? parseFloat(fee) : null,
        available_days: availableDays.trim() ? availableDays.trim().split(",").map((s) => s.trim()) : [],
        available_times: availableTimes.trim() ? availableTimes.trim().split(",").map((s) => s.trim()) : [],
        hospital_id: hospitalId.trim() || null,
      });
      setDocName("");
      setSpecialization("");
      setDocPhone("");
      setFee("");
      setAvailableDays("");
      setAvailableTimes("");
      setHospitalId("");
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add doctor");
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!window.confirm("Delete this doctor?")) return;
    try {
      await deleteDoctor(id);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete doctor");
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim() || !doctorSelection.trim() || !appointmentDate || !appointmentTime) {
      setError("Patient ID, doctor, date and time are required");
      return;
    }
    try {
      const doctor = doctors.find((d) => d.id === doctorSelection);
      const hospitalName = hospitalSelection || (doctor?.hospital_id ? "Linked Hospital" : "");
      await createAppointment({
        patient_id: patientId.trim(),
        doctor_id: doctorSelection || null,
        hospital_id: hospitalSelection || null,
        doctor_name: doctor?.name || "Doctor",
        hospital_name: hospitalName,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        consultation_fee_rupees: consultationFee.trim() ? parseFloat(consultationFee) : null,
        amount_paid_rupees: amountPaid.trim() ? parseFloat(amountPaid) : null,
        status: "pending",
        notes: appointmentNotes.trim() || null,
      });
      setPatientId("");
      setDoctorSelection("");
      setHospitalSelection("");
      setAppointmentDate("");
      setAppointmentTime("");
      setConsultationFee("");
      setAmountPaid("");
      setAppointmentNotes("");
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment");
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await updateAppointmentStatus(id, "cancelled");
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-28 screen-layout">
      <div className="lg-span-2 bg-white p-4 rounded-xl shadow-sm border border-[#e6eeff]/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-headline-md text-[20px] text-[#121c2a] font-bold">
              Doctor & Appointment
            </h2>
            <p className="font-label-sm text-[12px] text-[#574238]">
              Browse doctors and book medical appointments
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

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab("doctors")}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              tab === "doctors"
                ? "bg-[#00696b] text-white shadow-sm"
                : "bg-[#eff4ff] text-[#574238] hover:bg-[#dee9fc]"
            }`}
          >
            Doctors
          </button>
          <button
            onClick={() => setTab("appointments")}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              tab === "appointments"
                ? "bg-[#00696b] text-white shadow-sm"
                : "bg-[#eff4ff] text-[#574238] hover:bg-[#dee9fc]"
            }`}
          >
            Appointments
          </button>
        </div>

        {loading && <p className="text-[12px] text-[#64748b]">Loading...</p>}
        {error && <p className="text-[11px] text-[#dc2626] font-medium mb-2">{error}</p>}

        {tab === "doctors" && (
          <>
            <div className="space-y-2">
              {doctors.length === 0 ? (
                <div className="bg-[#f8fafc] p-4 rounded-xl text-center border border-[#d9e3f6]">
                  <span className="material-symbols-outlined text-[40px] text-[#9ca3af] mb-2">
                    person
                  </span>
                  <p className="text-[13px] text-[#475569]">No doctors registered yet</p>
                </div>
              ) : (
                doctors.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white p-3 rounded-xl shadow-sm border border-[#e6eeff]/60 flex items-start justify-between gap-3 mb-2"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#dee9fc] flex-shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#00696b] text-[20px]">
                          medical_information
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-headline-sm text-[15px] text-[#121c2a] font-bold">
                            {d.name}
                          </h3>
                          <span className="text-[10px] font-bold bg-[#e0f2f1] text-[#004d40] px-1.5 py-0.5 rounded">
                            {d.specialization}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#475569]">
                          {d.phone && <span>📞 {d.phone}</span>}
        {d.consultation_fee_rupees != null && (
          <span>• ₹{d.consultation_fee_rupees} consultation</span>
        )}
                        </div>
                        {d.available_days?.length && (
                          <p className="text-[11px] text-[#64748b] mt-1">
                            Available: {d.available_days.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoctor(d.id)}
                      type="button"
                      className="w-7 h-7 rounded-lg bg-[#fecaca] text-[#ba1a1a] flex items-center justify-center hover:bg-[#fca5a5] active:scale-95 transition-all"
                      aria-label={`Delete ${d.name}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-[#e6eeff] pt-3">
              <h4 className="font-headline-sm text-[14px] text-[#121c2a] font-bold mb-2">
                Add a new doctor
              </h4>
              <form onSubmit={handleAddDoctor} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">Name</label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="Dr. Name"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">Specialization</label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. General Physician"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">Phone</label>
                    <input
                      type="tel"
                      value={docPhone}
                      onChange={(e) => setDocPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">Fee (₹)</label>
                    <input
                      type="text"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      placeholder="Consultation fee"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Available days (comma separated)
                  </label>
                  <input
                    type="text"
                    value={availableDays}
                    onChange={(e) => setAvailableDays(e.target.value)}
                    placeholder="Mon, Wed, Fri"
                    className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Available times (comma separated)
                  </label>
                  <input
                    type="text"
                    value={availableTimes}
                    onChange={(e) => setAvailableTimes(e.target.value)}
                    placeholder="10:00, 14:00"
                    className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Hospital ID (optional)
                  </label>
                  <input
                    type="text"
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                    placeholder="Hospital ID"
                    className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-[#0f5257] text-white font-bold text-[13px] shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  Add Doctor
                </button>
              </form>
            </div>
          </>
        )}

        {tab === "appointments" && (
          <>
            <div className="space-y-2">
              {appointments.length === 0 ? (
                <div className="bg-[#f8fafc] p-4 rounded-xl text-center border border-[#d9e3f6]">
                  <span className="material-symbols-outlined text-[40px] text-[#9ca3af] mb-2">
                    event
                  </span>
                  <p className="text-[13px] text-[#475569]">No appointments booked yet</p>
                </div>
              ) : (
                appointments.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white p-3 rounded-xl shadow-sm border border-[#e6eeff]/60 flex items-start justify-between gap-3 mb-2"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#dee9fc] flex-shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#00696b] text-[20px]">
                          event
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-headline-sm text-[15px] text-[#121c2a] font-bold">
                            {a.doctor_name}
                          </h3>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            a.status === "confirmed"
                              ? "bg-[#dcfce7] text-[#166534]"
                              : a.status === "pending"
                              ? "bg-[#fffbeb] text-[#92400e]"
                              : a.status === "completed"
                              ? "bg-[#dee9fc] text-[#334155]"
                              : "bg-[#fecaca] text-[#ba1a1a]"
                          }`}>
                            {a.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#574238] mt-1">
                          {a.hospital_name} • {a.appointment_date} at {a.appointment_time}
                        </p>
                        <p className="text-[12px] text-[#574238] mt-0.5">
                          Patient ID: {a.patient_id}
                        </p>
                        {a.consultation_fee_rupees != null && (
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#475569]">
                            <span>Consultation: ₹{a.consultation_fee_rupees}</span>
                            {a.amount_paid_rupees != null && <span>• Paid: ₹{a.amount_paid_rupees}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={a.status}
                        onChange={(e) =>
                          updateAppointmentStatus(a.id, e.target.value as any)
                        }
                        className="h-8 rounded-lg border border-[#cbd5e1] bg-white text-[11px] px-2 outline-none focus:ring-2 focus:ring-[#e8762b]"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        onClick={() => handleCancel(a.id)}
                        type="button"
                        className="w-7 h-7 rounded-lg bg-[#fecaca] text-[#ba1a1a] flex items-center justify-center hover:bg-[#fca5a5] active:scale-95 transition-all"
                        aria-label={`Cancel ${a.doctor_name}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-[#e6eeff] pt-3">
              <h4 className="font-headline-sm text-[14px] text-[#121c2a] font-bold mb-2">
                Book a new appointment
              </h4>
              <form onSubmit={handleBookAppointment} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      Patient ID <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="Patient ID"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      Doctor ID <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={doctorSelection}
                      onChange={(e) => setDoctorSelection(e.target.value)}
                      placeholder="Doctor ID"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">Hospital ID</label>
                    <input
                      type="text"
                      value={hospitalSelection}
                      onChange={(e) => setHospitalSelection(e.target.value)}
                      placeholder="Hospital ID"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      Date <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">Time</label>
                    <input
                      type="text"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">Fee (₹)</label>
                    <input
                      type="text"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      placeholder="Consultation fee"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">Amount paid (₹)</label>
                  <input
                    type="text"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="Amount paid"
                    className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">Notes</label>
                  <input
                    type="text"
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    placeholder="Appointment notes"
                    className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] outline-none"
                  />
                </div>
                {error && <p className="text-[11px] text-[#dc2626] font-medium">{error}</p>}
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-[#0f5257] text-white font-bold text-[13px] shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  Book Appointment
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
