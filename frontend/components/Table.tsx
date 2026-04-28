export default function Table() {
  return (
    <div style={{ border: "1px solid blue", padding: "10px", margin: "10px" }}>
      <h2>Table Component</h2>
      <table border={1}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>John</td>
            <td>22</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}