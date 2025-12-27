import Image from "next/image";
import HomePage from "@/components/HomePage";

export default function Home() {
  return (
    <div className="flex items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center justify-between py-5 px-5 bg-white dark:bg-black sm:items-start">
      <HomePage/>
      </main>
    </div>
  );
}


