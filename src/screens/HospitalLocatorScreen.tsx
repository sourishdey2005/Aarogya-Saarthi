import React, { useState } from "react";
import { Hospital } from "../types";
import { listHospitals, createHospital, deleteHospital } from "../lib/api";

interface HospitalLocatorScreenProps {
  onBack?: () => void;
}

export const HospitalLocatorScreen: React.FC<HospitalLocatorScreenProps> = ({
  onBack
}) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filter, setFilter] = useState<"all" | "govt" | "private">("all");
  const [name, setName] = useState("");
  const [type, setType] = useState<"govt" | "private">("govt");
  const [village, setVillage] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [specialties, setSpecialties] = useState("");
  const [distance, setDistance] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const data = await listHospitals();
      setHospitals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hospitals");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Hospital name is required");
      return;
    }
    setIsAdding(true);
    try {
      await createHospital({
        name: name.trim(),
        type,
        village: village.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        emergency,
        specialties: specialties.trim() ? specialties.trim().split(",").map((s) => s.trim()) : [],
        distance_km: distance.trim() ? parseFloat(distance) : null,
      });
      setName("");
      setType("govt");
      setVillage("");
      setAddress("");
      setPhone("");
      setEmergency(false);
      setSpecialties("");
      setDistance("");
      await fetchHospitals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add hospital");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this hospital?")) return;
    try {
      await deleteHospital(id);
      await fetchHospitals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete hospital");
    }
  };

  const filtered = hospitals.filter((h) => filter === "all" || h.type === filter);
  const total = filtered.reduce((sum, h) => sum + (h.distance_km || 0), 0);

  return (
    <div className="flex flex-col w-full gap-4 pb-28 screen-layout">
      <div className="lg-span-2 bg-white p-4 rounded-xl shadow-sm border border-[#e6eeff]/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-headline-md text-[20px] text-[#121c2a] font-bold">
              Hospital Locator
            </h2>
            <p className="font-label-sm text-[12px] text-[#574238]">
              Find and manage nearby health facilities
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
          {["all", "govt", "private"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as "all" | "govt" | "private")}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f
                  ? "bg-[#00696b] text-white shadow-sm"
                  : "bg-[#eff4ff] text-[#574238] hover:bg-[#dee9fc]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="bg-[#f8fafc] p-6 rounded-xl text-center border border-[#d9e3f6]">
            <span className="material-symbols-outlined text-[40px] text-[#9ca3af] mb-2">
              location_on
            </span>
            <p className="text-[14px] text-[#475569]">No hospitals registered yet</p>
          </div>
        )}

        {filtered.map((h) => (
          <div
            key={h.id}
            className="bg-white p-3.5 rounded-xl shadow-sm border border-[#e6eeff]/60 flex items-start justify-between gap-3 mb-2"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#dee9fc] flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#00696b] text-[20px]">
                  local_hospital
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-sm text-[15px] text-[#121c2a] font-bold">
                    {h.name}
                  </h3>
                  {h.emergency && (
                    <span className="bg-[#fecaca] text-[#ba1a1a] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      Emergency
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    h.type === "govt" ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fffbeb] text-[#92400e]"
                  }`}>
                    {h.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-[12px] text-[#574238] mt-1">
                  {h.address || h.village || "Address not available"}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#475569]">
                  {h.phone && <span>📞 {h.phone}</span>}
                  {h.distance_km != null && <span>• {h.distance_km} km away</span>}
                  {h.specialties?.length && <span>• {h.specialties.join(", ")}</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDelete(h.id)}
              type="button"
              className="w-7 h-7 rounded-lg bg-[#fecaca] text-[#ba1a1a] flex items-center justify-center hover:bg-[#fca5a5] active:scale-95 transition-all"
              aria-label={`Delete ${h.name}`}
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
            </button>
          </div>
        ))}
      </div>

      {/* Add hospital form */}
      <div className="lg-span-2 bg-[#f8fafc] p-4 rounded-xl shadow-sm border border-[#e6eeff]/60">
        <h3 className="font-headline-sm text-[15px] text-[#121c2a] font-bold mb-3">
          Register a new hospital
        </h3>
        <form onSubmit={handleAdd} className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">
              Hospital name <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rampur PHC"
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] focus:border-[#e8762b] outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "govt" | "private")}
                className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] focus:border-[#e8762b] outline-none"
              >
                <option value="govt">Government</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                Distance (km)
              </label>
              <input
                type="text"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g. 3.5"
                className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] focus:border-[#e8762b] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">
              Village / Area
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Ward 4"
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] focus:border-[#e8762b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] focus:border-[#e8762b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] focus:border-[#e8762b] outline-none"
            />
          </div>
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={emergency}
              onChange={(e) => setEmergency(e.target.checked)}
              className="w-4 h-4 rounded border-[#cbd5e1] text-[#e8762b] focus:ring-[#e8762b] mt-0.5"
            />
            <label className="text-[12px] text-[#475569] font-medium">
              Provides emergency services
            </label>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">
              Specialties (comma separated)
            </label>
            <input
              type="text"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder="e.g. General Medicine, Pediatrics"
              className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[13px] focus:ring-2 focus:ring-[#e8762b] focus:border-[#e8762b] outline-none"
            />
          </div>
          {error && (
            <p className="text-[11px] text-[#dc2626] font-medium">{error}</p>
          )}
          <button
            type="submit"
            disabled={isAdding}
            className="w-full h-10 rounded-lg bg-[#0f5257] text-white font-bold text-[13px] shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isAdding ? "Adding..." : "Register Hospital"}
          </button>
        </form>
      </div>

      {filtered.length > 0 && (
        <div className="lg-span-2 bg-white p-3 rounded-xl shadow-sm border border-[#e6eeff]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-[#475569]">Total distance</span>
            <span className="text-[14px] font-bold text-[#0f5257]">{total.toFixed(1)} km</span>
          </div>
          <p className="text-[11px] text-[#64748b]">
            {filtered.length} facility{filtered.length !== 1 ? "ies" : ""} listed
          </p>
        </div>
      )}
    </div>
  );
};
