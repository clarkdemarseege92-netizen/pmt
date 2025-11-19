"use client";

import { useRouter } from "next/navigation";
import { HiArrowLeft } from "react-icons/hi2";

export default function BackButton() {
  const router = useRouter();

  return (
    <button 
      className="btn btn-circle btn-ghost border border-base-300 mr-2 bg-base-100 text-base-content/70 hover:border-primary hover:text-primary"
      onClick={() => router.back()}
      aria-label="返回上一页"
    >
      <HiArrowLeft className="w-5 h-5" />
    </button>
  );
}