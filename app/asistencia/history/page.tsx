import { AsistenciaHistoryContent } from "@/components/asistencia/AsistenciaHistoryContent";

export { ATTENDANCE_EXPORT_COLUMNS } from "@/components/asistencia/exportColumns";
export type { AttendanceRecord } from "@/components/asistencia/types";

export const metadata = {
  title: "Historial de Asistencia | KittnOS",
  description: "Control de entradas, salidas y duraciones de turno del personal",
};

export default function AttendanceHistoryPage() {
  return <AsistenciaHistoryContent />;
}
