import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RedirectPage({ params }: Props) {
  const { id } = await params;

  redirect(`/programs/${id}/weeks/default`);
}