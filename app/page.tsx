import { redirect } from "next/navigation";
import { getDefaultUser } from "@/lib/users";

export default function Home() {
  redirect(`/${getDefaultUser().slug}`);
}
