
# 📦 Inventory Tracking Dashboard

A responsive, feature-rich inventory management dashboard built with **React** and **Vite**. Provides real-time insights into stock levels, product performance, and inventory trends through interactive charts — with built-in export to PDF and Excel.

---

## ✨ Features

- 📊 **Interactive Charts** — visualize stock levels, sales trends, and category breakdowns using Chart.js
- 📁 **Export Reports** — download inventory data as **PDF** (via jsPDF + AutoTable) or **Excel** (via SheetJS/xlsx)
- 🔔 **Toast Notifications** — instant feedback for inventory actions (add, update, delete)
- 📅 **Date Filtering** — filter inventory records by custom date ranges with react-datepicker
- 🗂️ **Modal Dialogs** — clean add/edit/delete flows using react-modal
- 🧭 **Client-side Routing** — multi-page navigation with react-router-dom v6
- 🎨 **Tailwind CSS + shadcn/ui** — polished, utility-first UI with accessible components
- ⚡ **Vite** — blazing-fast dev server and production builds

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS, shadcn/ui |
| Charts | Chart.js, react-chartjs-2 |
| Routing | react-router-dom v6 |
| PDF Export | jsPDF, jspdf-autotable, html2pdf.js |
| Excel Export | SheetJS (xlsx) |
| Date Picker | react-datepicker |
| Notifications | react-hot-toast, react-toastify |
| Icons | react-icons |

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>= 18.x`
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Shaikh224/Inventory-Tracking-Dashboard.git

# 2. Navigate into the project
cd Inventory-Tracking-Dashboard

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
Inventory-Tracking-Dashboard/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route-level page components
│   ├── assets/         # Images, icons
│   ├── App.jsx         # Root component with routing
│   └── main.jsx        # Entry point
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```
## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Shaikh224** — [GitHub](https://github.com/Shaikh224)
