"use client";

import { useEffect, useState } from "react";
import Form from "../components/Form";
import Table from "../components/Table";

export default function Home() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:5000/config")
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Error:", err));
  }, []);

  if (!config) return <div>Loading config...</div>;

  return (
    <div>
      <h1>Dynamic UI</h1>

      {config.ui?.pages?.map((page: any, index: number) => {
        if (page.type === "form") return <Form key={index} />;
        if (page.type === "table") return <Table key={index} />;
        return null;
      })}
    </div>
  );
}