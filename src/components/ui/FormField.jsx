export default function FormField({ label, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="comic-label">{label}</label>
      {children}
      {error ? <p className="comic-error" role="alert">{error}</p> : hint ? <p className="comic-hint">{hint}</p> : null}
    </div>
  );
}
