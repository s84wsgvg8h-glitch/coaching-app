"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.title = "Login";
  }, []);

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <h1 className="text-3xl font-bold text-black mb-2">
          Inloggen
        </h1>

        <p className="text-gray-600 mb-6">
          Welkom terug bij je coaching dashboard
        </p>

        <input
          className="
            border
            rounded-lg
            p-3
            w-full
            mb-3
            text-black
            placeholder-gray-400
            bg-white
            outline-none
          "
          placeholder="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="
            border
            rounded-lg
            p-3
            w-full
            mb-4
            text-black
            placeholder-gray-400
            bg-white
            outline-none
          "
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="
            bg-black
            text-white
            rounded-lg
            p-3
            w-full
            font-semibold
            active:scale-[0.98]
            transition
          "
          onClick={login}
        >
          Inloggen
        </button>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Nog geen account?{" "}
          <a href="/signup" className="text-black font-semibold">
            Account maken
          </a>
        </p>
      </div>
    </main>
  );
}