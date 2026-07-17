"use client";

type LoadingProps = {
  message?: string;
};

export function Loading({ message = "Uploading images..." }: LoadingProps) {
  return (
    <div aria-live="polite" className="overlay" role="status">
      <div className="main">
        <div className="dog">
          <div className="dog__paws">
            <div className="dog__bl-leg leg">
              <div className="dog__bl-paw paw" />
              <div className="dog__bl-top top" />
            </div>
            <div className="dog__fl-leg leg">
              <div className="dog__fl-paw paw" />
              <div className="dog__fl-top top" />
            </div>
            <div className="dog__fr-leg leg">
              <div className="dog__fr-paw paw" />
              <div className="dog__fr-top top" />
            </div>
          </div>
          <div className="dog__body">
            <div className="dog__tail" />
          </div>
          <div className="dog__head">
            <div className="dog__snout">
              <div className="dog__nose" />
              <div className="dog__eyes">
                <div className="dog__eye-l" />
                <div className="dog__eye-r" />
              </div>
            </div>
          </div>
          <div className="dog__head-c">
            <div className="dog__ear-l" />
            <div className="dog__ear-r" />
          </div>
        </div>
      </div>
      <p className="message">{message}</p>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 20000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.94), rgba(250, 247, 241, 0.92) 42%, rgba(244, 238, 229, 0.96)),
            rgba(250, 247, 241, 0.96);
          color: #1c3130;
          backdrop-filter: blur(4px);
        }

        .message {
          margin: 0;
          max-width: min(80vw, 26rem);
          text-align: center;
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0;
        }

        .main {
          position: relative;
          width: min(23.5vmax, 18rem);
          height: min(23.5vmax, 18rem);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .main,
        .main * {
          box-sizing: border-box;
        }

        .leg {
          position: absolute;
          bottom: 0;
          width: min(2vmax, 1.55rem);
          height: min(2.125vmax, 1.65rem);
        }

        .paw {
          position: absolute;
          bottom: 0;
          left: 0;
          width: min(1.95vmax, 1.52rem);
          height: min(1.875vmax, 1.46rem);
          overflow: hidden;
        }

        .paw::before {
          content: "";
          position: absolute;
          width: min(3.75vmax, 2.9rem);
          height: min(3.75vmax, 2.9rem);
          border-radius: 50%;
        }

        .top {
          position: absolute;
          bottom: 0;
          left: min(0.75vmax, 0.58rem);
          height: min(4.5vmax, 3.5rem);
          width: min(2.625vmax, 2.04rem);
          border-top-left-radius: min(1.425vmax, 1.1rem);
          border-top-right-radius: min(1.425vmax, 1.1rem);
          transform-origin: bottom right;
          transform: rotateZ(90deg) translateX(min(-0.1vmax, -0.08rem))
            translateY(min(1.5vmax, 1.16rem));
          z-index: -1;
          background-image: linear-gradient(70deg, transparent 20%, #ff8b56 20%);
        }

        .dog {
          position: relative;
          width: min(22.5vmax, 17.45rem);
          height: min(8.25vmax, 6.4rem);
        }

        .dog::before {
          content: "";
          position: absolute;
          bottom: min(-0.75vmax, -0.58rem);
          right: min(-0.15vmax, -0.12rem);
          width: 100%;
          height: min(1.5vmax, 1.16rem);
          background-color: rgba(28, 49, 48, 0.1);
          border-radius: 50%;
          z-index: -1000;
          animation: shadow 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
        }

        .dog__head {
          position: absolute;
          left: min(4.5vmax, 3.5rem);
          bottom: 0;
          width: min(9.75vmax, 7.56rem);
          height: min(8.25vmax, 6.4rem);
          border-top-left-radius: min(4.05vmax, 3.14rem);
          border-top-right-radius: min(4.05vmax, 3.14rem);
          border-bottom-right-radius: min(3.3vmax, 2.56rem);
          border-bottom-left-radius: min(3.3vmax, 2.56rem);
          background-color: #ff8147;
          animation: head 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
        }

        .dog__head-c {
          position: absolute;
          left: min(1.5vmax, 1.16rem);
          bottom: 0;
          width: min(9.75vmax, 7.56rem);
          height: min(8.25vmax, 6.4rem);
          animation: head 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
          z-index: -1;
        }

        .dog__snout {
          position: absolute;
          left: min(-1.5vmax, -1.16rem);
          bottom: 0;
          width: min(7.5vmax, 5.82rem);
          height: min(3.75vmax, 2.9rem);
          border-top-right-radius: min(3vmax, 2.33rem);
          border-bottom-right-radius: min(3vmax, 2.33rem);
          border-bottom-left-radius: min(4.5vmax, 3.5rem);
          background-color: #d7dbd2;
          animation: snout 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
        }

        .dog__snout::before {
          content: "";
          position: absolute;
          left: min(-0.1125vmax, -0.09rem);
          top: min(-0.15vmax, -0.12rem);
          width: min(1.875vmax, 1.46rem);
          height: min(1.125vmax, 0.87rem);
          border-top-right-radius: min(3vmax, 2.33rem);
          border-bottom-right-radius: min(3vmax, 2.33rem);
          border-bottom-left-radius: min(4.5vmax, 3.5rem);
          background-color: #1c3130;
          animation: snout-b 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
        }

        .dog__nose {
          position: absolute;
          top: min(-1.95vmax, -1.51rem);
          left: 40%;
          width: min(0.75vmax, 0.58rem);
          height: min(2.4vmax, 1.86rem);
          border-radius: min(0.525vmax, 0.41rem);
          transform-origin: bottom;
          transform: rotateZ(10deg);
          background-color: #d7dbd2;
        }

        .dog__eye-l,
        .dog__eye-r {
          position: absolute;
          top: min(-0.9vmax, -0.7rem);
          width: min(0.675vmax, 0.52rem);
          height: min(0.375vmax, 0.29rem);
          border-radius: 50%;
          background-color: #1c3130;
          animation: eye 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
        }

        .dog__eye-l {
          left: 27%;
        }

        .dog__eye-r {
          left: 65%;
        }

        .dog__ear-l,
        .dog__ear-r {
          position: absolute;
          width: min(10.5vmax, 8.14rem);
          height: min(3.375vmax, 2.62rem);
          border-top-left-radius: 0;
          border-top-right-radius: 0;
          border-bottom-right-radius: min(3.3vmax, 2.56rem);
          border-bottom-left-radius: min(3.3vmax, 2.56rem);
          background-color: #e26538;
        }

        .dog__ear-l {
          top: min(1.5vmax, 1.16rem);
          left: min(6vmax, 4.65rem);
          transform-origin: bottom left;
          transform: rotateZ(-50deg);
          z-index: -1;
          animation: ear-l 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
        }

        .dog__ear-r {
          top: min(1.5vmax, 1.16rem);
          right: min(3vmax, 2.33rem);
          transform-origin: bottom right;
          transform: rotateZ(20deg);
          z-index: -2;
          animation: ear-r 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
        }

        .dog__body {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          position: absolute;
          bottom: min(0.3vmax, 0.23rem);
          left: min(3.75vmax, 2.9rem);
          width: min(18.75vmax, 14.54rem);
          height: min(7.2vmax, 5.58rem);
          border-top-left-radius: min(3vmax, 2.33rem);
          border-top-right-radius: min(6vmax, 4.65rem);
          border-bottom-right-radius: min(1.5vmax, 1.16rem);
          border-bottom-left-radius: min(6vmax, 4.65rem);
          background-color: #ff702e;
          z-index: -2;
          animation: body 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
        }

        .dog__tail {
          position: absolute;
          right: min(-3vmax, -2.33rem);
          height: min(1.5vmax, 1.16rem);
          width: min(4.5vmax, 3.5rem);
          background-color: #e96839;
          border-radius: min(1.5vmax, 1.16rem);
        }

        .dog__paws {
          position: absolute;
          bottom: 0;
          left: min(7.5vmax, 5.82rem);
          width: min(12vmax, 9.3rem);
          height: min(3vmax, 2.33rem);
        }

        .dog__bl-leg {
          left: min(-3vmax, -2.33rem);
          z-index: -10;
        }

        .dog__bl-paw::before {
          background-color: #bec4b6;
        }

        .dog__bl-top {
          background-image: linear-gradient(80deg, transparent 20%, #e96839 20%);
        }

        .dog__fl-leg {
          z-index: 10;
          left: 0;
        }

        .dog__fl-paw::before {
          background-color: #d7dbd2;
        }

        .dog__fr-leg {
          right: 0;
        }

        .dog__fr-paw::before {
          background-color: #d7dbd2;
        }

        @keyframes head {
          0%,
          10%,
          20%,
          26%,
          28%,
          90%,
          100% {
            height: min(8.25vmax, 6.4rem);
            bottom: 0;
            transform-origin: bottom right;
            transform: rotateZ(0);
          }
          5%,
          15%,
          22%,
          24%,
          30% {
            height: min(8.1vmax, 6.28rem);
          }
          32%,
          50% {
            height: min(8.25vmax, 6.4rem);
          }
          55%,
          60% {
            bottom: min(0.75vmax, 0.58rem);
            transform-origin: bottom right;
            transform: rotateZ(0);
          }
          70%,
          80% {
            bottom: min(0.75vmax, 0.58rem);
            transform-origin: bottom right;
            transform: rotateZ(10deg);
          }
        }

        @keyframes body {
          0%,
          10%,
          20%,
          26%,
          28%,
          32%,
          100% {
            height: min(7.2vmax, 5.58rem);
          }
          5%,
          15%,
          22%,
          24%,
          30% {
            height: min(7.05vmax, 5.46rem);
          }
        }

        @keyframes ear-l {
          0%,
          10%,
          20%,
          26%,
          28%,
          82%,
          100% {
            transform: rotateZ(-50deg);
          }
          5%,
          15%,
          22%,
          24% {
            transform: rotateZ(-48deg);
          }
          30%,
          31% {
            transform: rotateZ(-30deg);
          }
          32%,
          80% {
            transform: rotateZ(-60deg);
          }
        }

        @keyframes ear-r {
          0%,
          10%,
          20%,
          26%,
          28% {
            transform: rotateZ(20deg);
          }
          5%,
          15%,
          22%,
          24% {
            transform: rotateZ(18deg);
          }
          30%,
          31% {
            transform: rotateZ(10deg);
          }
          32% {
            transform: rotateZ(25deg);
          }
        }

        @keyframes snout {
          0%,
          10%,
          20%,
          26%,
          28%,
          82%,
          100% {
            height: min(3.75vmax, 2.9rem);
          }
          5%,
          15%,
          22%,
          24% {
            height: min(3.45vmax, 2.67rem);
          }
        }

        @keyframes snout-b {
          0%,
          10%,
          20%,
          26%,
          28%,
          98%,
          100% {
            width: min(1.875vmax, 1.46rem);
          }
          5%,
          15%,
          22%,
          24% {
            width: min(1.8vmax, 1.4rem);
          }
          34%,
          98% {
            width: min(1.275vmax, 0.99rem);
          }
        }

        @keyframes shadow {
          0%,
          10%,
          20%,
          26%,
          28%,
          30%,
          84%,
          100% {
            width: 99%;
          }
          5%,
          15%,
          22%,
          24% {
            width: 101%;
          }
          34%,
          81% {
            width: 96%;
          }
        }

        @keyframes eye {
          0%,
          30% {
            width: min(0.675vmax, 0.52rem);
            height: min(0.3vmax, 0.23rem);
          }
          32%,
          59%,
          90%,
          100% {
            width: min(0.525vmax, 0.41rem);
            height: min(0.525vmax, 0.41rem);
            transform: translateY(0);
          }
          60%,
          75% {
            transform: translateY(min(-0.3vmax, -0.23rem));
          }
          80%,
          85% {
            transform: translateY(min(0.15vmax, 0.12rem));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dog::before,
          .dog__head,
          .dog__head-c,
          .dog__snout,
          .dog__snout::before,
          .dog__eye-l,
          .dog__eye-r,
          .dog__ear-l,
          .dog__ear-r,
          .dog__body {
            animation-duration: 1ms;
            animation-iteration-count: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default Loading;
