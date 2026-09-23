import Image from "next/image";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050811] text-white">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/10 via-cyan-500/10 to-transparent rounded-full blur-[100px] animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center z-10 space-y-6">
        {/* Pulsing Logo Container */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-cyan-500/30 to-blue-500/30 rounded-2xl blur-lg animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/60 p-2 backdrop-blur-md">
            <Image
              src="/logo.jpg"
              alt="ORVEXA PRIME"
              width={80}
              height={80}
              className="w-full h-full object-contain drop-shadow"
              priority
            />
          </div>
        </div>

        {/* Brand Text */}
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-white to-cyan-300">
            ORVEXA PRIME
          </h2>
          <p className="text-xs tracking-widest text-slate-400 uppercase">
            A fusão das maiores inteligências
          </p>
        </div>

        {/* Futuristic loading line */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-500 animate-[loadingBar_1.8s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

