import Image from "next/image";
import React from "react";

const AppLogo = () => {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      height={20}
      src="/favicon.ico"
      unoptimized
      width={24}
    />
  );
};

export default AppLogo;
