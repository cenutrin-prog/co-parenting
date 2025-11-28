import { useState } from "react";

export default function App() {
  // Datos iniciales escritos por el usuario
  const [data, setData] = useState({
    fatherName: "",
    motherName: "",
    child1Name: "",
    child2Name: "",
    profile: null, // 'father' | 'mother' | 'child1' | 'child2'
  });

  // Para cada día
  const [selectedDay, setSelectedDay] = useState(null);

  // Semana LUN‑DOM
  const week = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  // Barra superior
  const renderHeader = () => {
    let currentName = "";
    if (data.profile === "father") currentName = data.fatherName;
    if (data.profile === "mother") currentName = data.motherName;
    if (data.profile === "child1") currentName = data.child1Name;
    if (data.profile === "child2") currentName = data.child2Name;

    return (
      <div style={{
        width: "100%",
        padding: "10px",
        background: data.profile === "father" ? "#4A90E2" : data.profile === "mother" ? "#E24A72" : data.profile === "child1" ? "#8E44AD" : data.profile === "child2" ? "#27AE60" : "#333",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ fontSize: "20px", fontWeight: "bold" }}>CoParenting</div>
        <div style={{
          padding: "4px 10px",
          border: "2px solid white",
          borderRadius: "8px",
          fontSize: "16px",
        }}>{currentName}</div>
      </div>
    );
  };

  // Pantalla inicial para escribir nombres
  const renderSetup = () => (
    <div style={{ padding: 20 }}>
      <h2>Configurar nombres</h2>
      <input
        placeholder="Nombre del padre"
        value={data.fatherName}
        onChange={(e) => setData({ ...data, fatherName: e.target.value })}
        style={{ display: "block", marginBottom: 10, width: "100%" }}
      />
      <input
        placeholder="Nombre de la madre"
        value={data.motherName}
        onChange={(e) => setData({ ...data, motherName: e.target.value })}
        style={{ display: "block", marginBottom: 10, width: "100%" }}
      />
      <input
        placeholder="Nombre hija 1"
        value={data.child1Name}
        onChange={(e) => setData({ ...data, child1Name: e.target.value })}
        style={{ display: "block", marginBottom: 10, width: "100%" }}
      />
      <input
        placeholder="Nombre hija 2"
        value={data.child2Name}
        onChange={(e) => setData({ ...data, child2Name: e.target.value })}
        style={{ display: "block", marginBottom: 10, width: "100%" }}
      />

      <h3>Entrar como:</h3>
      <button onClick={() => setData({ ...data, profile: "father" })} style={{ width: "100%", marginBottom: 10 }}>Continuar como {data.fatherName || "Padre"}</button>
      <button onClick={() => setData({ ...data, profile: "mother" })} style={{ width: "100%", marginBottom: 10 }}>Continuar como {data.motherName || "Madre"}</button>
      <button onClick={() => setData({ ...data, profile: "child1" })} style={{ width: "100%", marginBottom: 10 }}>Continuar como {data.child1Name || "Hijo 1"}</button>
      <button onClick={() => setData({ ...data, profile: "child2" })} style={{ width: "100%" }}>Continuar como {data.child2Name || "Hijo 2"}</button>
    </div>
  );

  // Vista semanal
  const renderWeekly = () => (
    <div style={{ padding: 20 }}>
      <h2>Semana (Lunes - Domingo)</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {week.map((day, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (data.profile === "father" || data.profile === "mother") {
                setSelectedDay(day);
              }
            }}
            style={{
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "#f5f5f5",
              cursor: data.profile === "child1" || data.profile === "child2" ? "default" : "pointer",
            }}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );

  // Vista día (solo padres pueden ver)
  const renderDay = () => (
    <div style={{ padding: 20 }}>
      <h2>{selectedDay}</h2>

      <label>Quién tiene a {data.child1Name}:</label>
      <select style={{ display: "block", marginBottom: 20 }}>
        <option>{data.fatherName}</option>
        <option>{data.motherName}</option>
      </select>

      <label>Quién tiene a {data.child2Name}:</label>
      <select style={{ display: "block", marginBottom: 20 }}>
        <option>{data.fatherName}</option>
        <option>{data.motherName}</option>
      </select>

      <button onClick={() => setSelectedDay(null)}>Volver</button>
    </div>
  );

  // Según perfil mostrar opciones
  const renderMenu = () => (
    <div style={{ padding: 20 }}>
      <h2>Menú principal</h2>
      <button style={{ width: "100%", marginBottom: 10 }} onClick={() => setSelectedDay("weekly")}>Vista semanal</button>
    </div>
  );

  // --- RENDER GENERAL ---
  if (!data.profile) return renderSetup();
  if (selectedDay === "weekly") return (<>
    {renderHeader()}
    {renderWeekly()}
  </>);
  if (selectedDay && selectedDay !== "weekly") return (<>
    {renderHeader()}
    {renderDay()}
  </>);

  return (
    <>
      {renderHeader()}
      {renderMenu()}
    </>
  );
}
