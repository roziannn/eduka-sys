"use client";

import { useState } from "react";
import { Users, FileCheck, ChevronRight, ArrowLeft } from "lucide-react";

interface Student {
  id: string;
  nama: string;
  nis: string;
  status: "Sudah Dikoreksi" | "Belum Dikoreksi";
  nilai: number | null;
}

const dummyClasses = ["X IPA 1", "X IPA 2", "X IPA 3", "X IPS 1", "X IPS 2"];

const dummyStudents: Record<string, Student[]> = {
  "X IPA 1": [
    { id: "101", nama: "Ahmad Rizky", nis: "2026001", status: "Sudah Dikoreksi", nilai: 85 },
    { id: "102", nama: "Budi Santoso", nis: "2026002", status: "Belum Dikoreksi", nilai: null },
    { id: "103", nama: "Citra Dewi", nis: "2026003", status: "Sudah Dikoreksi", nilai: 92 },
  ],
  "X IPA 2": [
    { id: "201", nama: "Deni Pratama", nis: "2026004", status: "Belum Dikoreksi", nilai: null },
    { id: "202", nama: "Eka Putri", nis: "2026005", status: "Belum Dikoreksi", nilai: null },
  ],
};

export default function DetailKoreksiPage() {
  const [selectedClass, setSelectedClass] = useState<string>("X IPA 1");

  const students = dummyStudents[selectedClass] || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header & Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <a
          href="/koreksi-ujian"
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
        >
          <ArrowLeft size={18} />
        </a>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Koreksi: Penilaian Tengah Semester - Matematika
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">TOKEN: MTK2026</p>
        </div>
      </div>

      {/* Main Layout dengan Sidebar Aside */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Aside - Daftar Kelas */}
        <aside className="w-full md:w-64 bg-white rounded-lg shadow border border-gray-200 p-4 shrink-0 h-fit">
          <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700 uppercase tracking-wider">
            <Users size={16} />
            Pilih Kelas
          </div>
          <nav className="space-y-1">
            {dummyClasses.map((className) => {
              const isActive = selectedClass === className;
              return (
                <button
                  key={className}
                  onClick={() => setSelectedClass(className)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>{className}</span>
                  {isActive && <ChevronRight size={16} className="text-blue-600" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area - Daftar Siswa */}
        <main className="flex-1 bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">
              Daftar Siswa — <span className="text-blue-600">{selectedClass}</span>
            </h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
              Total: {students.length} Siswa
            </span>
          </div>

          {students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">NIS</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Status Koreksi</th>
                    <th className="py-2.5 px-3">Nilai</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-mono text-xs">{student.nis}</td>
                      <td className="py-3 px-3 font-medium">{student.nama}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                            student.status === "Sudah Dikoreksi"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        {student.nilai !== null ? student.nilai : "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-md font-medium transition-colors">
                          <FileCheck size={14} />
                          Koreksi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              Belum ada data siswa untuk kelas ini.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}