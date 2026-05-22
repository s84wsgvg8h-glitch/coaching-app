"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    if (!data.user) {
      alert("Geen user aangemaakt");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        full_name: fullName,
        role: "pending",
      });

    if (profileError) {
      alert(profileError.message);
      return;
    }

    alert("Account aanvraag verstuurd");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <h1 className="text-3xl font-bold text-black mb-2">
          Account maken
        </h1>

        <p className="text-gray-600 mb-6">
          Vraag toegang aan als atleet
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
          placeholder="Volledige naam"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

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
          onClick={signUp}
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
        >
          Account aanvragen
        </button>
      </div>
    </main>
  );
}