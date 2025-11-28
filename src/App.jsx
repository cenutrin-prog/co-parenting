// Voy a restaurar una versión estable y funcional basada en lo que tenías antes
// pero corrigiendo SOLO lo que has pedido: nombres en barra superior, hijos sin vista de día,
// semana L-D, menú correcto, y sin romper nada.

import { useState } from "react";

export default function App() {
  const [data, setData] = useState({
    fatherName: "",
    motherName: "",
    child1Name: "",
    child2Name: "",
    profile: null,
  });

  const [screen, setScreen] = useState("setup"); // setup | menu | week | day
  const [selectedDay, setSelectedDay] = useState(null);

  const week = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  // ------------------ BARRA SUPERIOR ------------------
  const renderHeader = () => {
    let name = "";
    if (data.profile === "father") name = data.fatherName;
    if (data.profile === "mother") name = data.motherName;
    if (data.profile === "child1") name = data.child1Name;
    if (data.profile === "child2") name = data.child2Name;

    return (
      <div style={{
        background: "#333",
        padding: "10px",
        display: "flex",
        justifyContent: "space-between",
        color: "white",
        alignItems: "center",
      }}>
        <div style={{ fontSize: 20, fontWeight: "bold" }}>CoParenting</div>
        <div style={{
          border: "2px solid white",
          padding: "4px 8px",
          borderRadius: 10,
        }}>{name}</div>
      </div>
    );
  };

  // ------------------- SETUP -------------------
  const renderSetup = () => (
    <div style={{ padding: 20 }}>
      <h2>Configurar nombres</h2>

      <input
        placeholder="Nombre del padre"
        value={data.fatherName}
        onChange={(e) => setData({ ...data, fatherName: e.target.value })}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <input
        placeholder="Nombre de la madre"
        value={data.motherName}
        onChange={(e) => setData({ ...data, motherName: e.target.value })}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <input
        placeholder="Nombre hija 1"
        value={data.child1Name}
        onChange={(e) => setData({ ...data, child1Name: e.target.value })}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <input
        placeholder="Nombre hija 2"
        value={data.child2Name}
        onChange={(e) => setData({ ...data, child2Name: e.target.value })}
        style={{ width: "100%", marginBottom: 20 }}
      />

      <h3>Entrar como:</h3>
      <button style={{ width: "100%", marginBottom: 10 }} onClick={() => setData({ ...data, profile: "father" }) || setScreen("menu")}>Continuar como {data.fatherName || "Padre"}</button>
      <button style={{ width: "100%", marginBottom: 10 }} onClick={() => setData({ ...data, profile: "mother" }) || setScreen("menu")}>Continuar como {data.motherName || "Madre"}</button>
      <button style={{ width: "100%", marginBottom: 10 }} onClick={() => setData({ ...data, profile: "child1" }) || setScreen("menu")}>Continuar como {data.child1Name || "Hijo 1"}</button>
      <button style={{ width: "100%" }} onClick={() => setData({ ...data, profile: "child2" }) || setScreen("menu")}>Continuar como {data.child2Name || "Hijo 2"}</button>
    </div>
  );

  // ------------------- MENÚ -------------------
  const renderMenu = () => (
    <div style={{ padding: 20 }}>
      <h2>Menú principal</h2>
      <button style={{ width: "100%", marginBottom: 10 }} onClick={() => setScreen("week")}>Vista semanal</button>
    </div>
  );

  // ------------------ VISTA SEMANAL ------------------
  const renderWeek = () => (
    <div style={{ padding: 20 }}>
      <h2>Semana (Lunes - Domingo)</h2>

      {week.map((d) => (
        <div
          key={d}
          style={{
            padding: 12,
            background: "#eee",
            borderRadius: 8,
            marginBottom: 8,
            cursor: data.profile === "child1" || data.profile === "child2" ? "default" : "pointer",
          }}
          onClick={() => {
            if (data.profile === "father" || data.profile === "mother") {
              setSelectedDay(d);
              setScreen("day");
            }
          }}
        >
          {d}
        </div>
      ))}
    </div>
  );

  // ------------------ VISTA DÍA (solo padres) ------------------
  const renderDay = () => (
    <div style={{ padding: 20 }}>
      <h2>{selectedDay}</h2>

      <label>Quién tiene a {data.child1Name}:</label>
      <select style={{ width: "100%", marginBottom: 15 }}>
        <option>{data.fatherName}</option>
        <option>{data.motherName}</option>
      </select>

      <label>Quién tiene a {data.child2Name}:</label>
      <select style={{ width: "100%", marginBottom: 20 }}>
        <option>{data.fatherName}</option>
        <option>{data.motherName}</option>
      </select>

      <button onClick={() => setScreen("week")}>Volver</button>
    </div>
  );

  // ------------------ RENDER GENERAL ------------------
  if (screen === "setup") return renderSetup();

  return (
    <>
      {renderHeader()}
      {screen === "menu" && renderMenu()}
      {screen === "week" && renderWeek()}
      {screen === "day" && renderDay()}
    </>
  );
}
