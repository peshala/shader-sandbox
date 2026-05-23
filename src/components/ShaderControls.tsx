"use client";

import { ShaderControl } from "@/types/shader";
import { useCallback } from "react";

interface Props {
  controls: ShaderControl[];
  values: Record<string, number | number[]>;
  onChange: (name: string, value: number | number[]) => void;
}

function FloatSlider({
  control,
  value,
  onChange,
}: {
  control: ShaderControl;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-300">{control.label}</span>
        <span className="text-gray-500 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={control.min ?? 0}
        max={control.max ?? 1}
        step={control.step ?? 0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

function ColorPicker({
  control,
  value,
  onChange,
}: {
  control: ShaderControl;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
}) {
  const toHex = (rgb: [number, number, number]) => {
    const r = Math.round(rgb[0] * 255).toString(16).padStart(2, "0");
    const g = Math.round(rgb[1] * 255).toString(16).padStart(2, "0");
    const b = Math.round(rgb[2] * 255).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  };

  const fromHex = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-300">{control.label}</span>
      <input
        type="color"
        value={toHex(value)}
        onChange={(e) => onChange(fromHex(e.target.value))}
        className="w-8 h-6 rounded border border-gray-700 cursor-pointer bg-transparent"
      />
    </div>
  );
}

function Checkbox({
  control,
  value,
  onChange,
}: {
  control: ShaderControl;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value > 0.5}
        onChange={(e) => onChange(e.target.checked ? 1 : 0)}
        className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-blue-500 cursor-pointer"
      />
      <span className="text-xs text-gray-300">{control.label}</span>
    </label>
  );
}

export default function ShaderControls({ controls, values, onChange }: Props) {
  const handleReset = useCallback(() => {
    controls.forEach((c) => onChange(c.name, c.default));
  }, [controls, onChange]);

  if (controls.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-950 border-t border-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Controls</span>
        <button
          onClick={handleReset}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>
      {controls.map((control) => {
        if (control.type === "float") {
          return (
            <FloatSlider
              key={control.name}
              control={control}
              value={(values[control.name] as number) ?? (control.default as number)}
              onChange={(v) => onChange(control.name, v)}
            />
          );
        }
        if (control.type === "bool") {
          return (
            <Checkbox
              key={control.name}
              control={control}
              value={(values[control.name] as number) ?? (control.default as number)}
              onChange={(v) => onChange(control.name, v)}
            />
          );
        }
        if (control.type === "color") {
          return (
            <ColorPicker
              key={control.name}
              control={control}
              value={(values[control.name] as [number, number, number]) ?? control.default}
              onChange={(v) => onChange(control.name, v)}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
