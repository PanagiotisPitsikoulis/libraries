import { Button } from "../../components/ui/button";
import "../../styles/globals.css";

export interface AiFormCompleteProps {
  children?: React.ReactNode;
  className?: string;
}

export function AiFormComplete({ children, className }: AiFormCompleteProps) {
  return (
    <Button className={className}>
      {children || <h1 className="text-lg font-semibold bg-red-500">AiFormComplete</h1>}
    </Button>
  );
}

export function helloAiForm() {
  return "Hello from AI Form Complete!";
}