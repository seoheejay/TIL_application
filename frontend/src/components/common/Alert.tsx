export function Alert({ message }: { message: string }) {
  return (
    <div className="alert" role="alert">
      {message}
    </div>
  )
}
