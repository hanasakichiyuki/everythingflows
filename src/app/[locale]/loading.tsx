import Image from "next/image";

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="status"
      aria-label="页面加载中"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <Image
        src="/loading.webp"
        alt=""
        width={384}
        height={384}
        className="anim-pop-in relative z-10 h-64 w-64 select-none object-cover md:h-96 md:w-96"
        draggable={false}
        unoptimized
        priority
      />
    </div>
  );
}
