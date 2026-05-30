import { redirect } from "next/navigation";

export default function StatisticsPage() {
  redirect("/data?tab=statistieken");
}
