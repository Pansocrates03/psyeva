import Sidebar from "../components/Sidebar";
import COLORS from "../utils/Colors";

export default function WIP() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />
      <h1>Work in progress</h1>
    </div>
  );
}