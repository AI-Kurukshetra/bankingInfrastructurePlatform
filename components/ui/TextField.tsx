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
        className="peer block w-full rounded-2xl border border-blue-100 bg-white px-4 pb-3 pt-6 text-[14px] leading-5 text-slate-900 shadow-sm outline-none transition placeholder:text-transparent hover:border-blue-200 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-700 dark:focus:border-blue-500 dark:focus:bg-slate-900 dark:focus:ring-blue-900/40"
        {...props}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-4 top-3 origin-left text-[12px] font-medium text-slate-500 transition-all peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[13px] peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400 peer-focus:top-3 peer-focus:text-[12px] peer-focus:font-medium peer-focus:text-blue-700 dark:text-slate-400 dark:peer-placeholder-shown:text-slate-500 dark:peer-focus:text-blue-400"
      >
        {label}
      </label>
      <div className="pointer-events-none absolute inset-x-4 bottom-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-0 transition peer-focus:opacity-100 dark:via-blue-700" />
    </div>
  );
});

export default TextField;
