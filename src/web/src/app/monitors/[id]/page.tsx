import type { Metadata } from "next";
import MonitorDetail from "@/components/MonitorDetail";

export const metadata: Metadata = {
  title: "Monitor | Uppy",
};

export default async function MonitorPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <MonitorDetail id={id} />;
}