import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "placeholder"
> & {
  label: string;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, type = "text", ...props },
  ref
) {
  const inputId = id ?? props.name;

  return (
    <div className="relative">
      <input
        ref={ref}
        id={inputId}
        type={type}
        placeholder=" "
        className="peer block w-full rounded-2xl border border-slate-200/80 bg-white/60 px-4 pb-3 pt-6 text-[14px] leading-5 text-slate-900 shadow-sm outline-none backdrop-blur transition
        placeholder:text-transparent
        hover:border-slate-200
        focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        {...props}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-4 top-3 origin-left text-[12px] font-medium text-slate-500 transition-all
        peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[13px] peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400
        peer-focus:top-3 peer-focus:text-[12px] peer-focus:font-medium peer-focus:text-slate-500"
      >
        {label}
      </label>
      <div className="pointer-events-none absolute inset-x-4 bottom-1 h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent opacity-0 transition peer-focus:opacity-100" />
    </div>
  );
});

export default TextField;
