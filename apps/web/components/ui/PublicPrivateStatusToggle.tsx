import styled from "styled-components";

type PublicPrivateStatusToggleProps = {
  ariaLabel: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

const PublicPrivateStatusToggle = ({
  ariaLabel,
  checked,
  disabled = false,
  onCheckedChange,
}: PublicPrivateStatusToggleProps) => {
  return (
    <StyledWrapper>
      <div className="toggle-container" data-disabled={disabled || undefined}>
        <input
          aria-checked={checked}
          aria-label={ariaLabel}
          checked={checked}
          className="toggle-input"
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          role="switch"
          type="checkbox"
        />
        <div className="toggle-handle-wrapper">
          <div className="toggle-handle">
            <div className="toggle-handle-knob" />
            <div className="toggle-handle-bar-wrapper">
              <div className="toggle-handle-bar" />
            </div>
          </div>
        </div>
        <div className="toggle-base">
          <div className="toggle-base-inside" />
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  --toggle-size: 9px;
  display: inline-flex;
  align-items: flex-end;
  height: calc(var(--toggle-size) * 4.75);
  padding-top: calc(var(--toggle-size) * 0.25);

  .toggle-container {
    --knob-size: 1.75em;
    display: flex;
    justify-content: center;
    position: relative;
    font-size: var(--toggle-size);
  }

  .toggle-container[data-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .toggle-input {
    position: absolute;
    z-index: 2;
    bottom: 132.5%;
    border-radius: 50%;
    transform: rotate(-25deg);
    transform-origin: 50% 4.75em;
    width: var(--knob-size);
    height: var(--knob-size);
    opacity: 0;
    font: inherit;
    transition: transform 0.24s cubic-bezier(0.65, 1.35, 0.5, 1);
    cursor: pointer;
  }

  .toggle-container[data-disabled="true"] .toggle-input {
    cursor: not-allowed;
  }

  .toggle-input:checked {
    transform: rotate(25deg);
  }

  .toggle-input:focus-visible + .toggle-handle-wrapper .toggle-handle-knob {
    outline: 2px solid oklch(var(--color-accent) / 0.55);
    outline-offset: 2px;
  }

  .toggle-handle-wrapper {
    position: absolute;
    z-index: 1;
    bottom: -135%;
    -webkit-mask-image: linear-gradient(to bottom, #000 62.125%, transparent 50%);
    mask-image: linear-gradient(to bottom, #000 62.125%, transparent 50%);
    width: 200%;
    overflow: hidden;
    pointer-events: none;
  }

  .toggle-handle {
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: rotate(-25deg);
    transform-origin: bottom center;
    transition: transform 0.24s cubic-bezier(0.65, 1.35, 0.5, 1);
  }

  .toggle-input:checked + .toggle-handle-wrapper > .toggle-handle {
    transform: rotate(25deg);
  }

  .toggle-handle-knob {
    position: relative;
    z-index: 1;
    border-radius: 50%;
    width: var(--knob-size);
    height: var(--knob-size);
    background-image: radial-gradient(
      farthest-corner at 70% 30%,
      #fedee2 4%,
      #d63534 12% 24%,
      #a81a1a 50% 65%,
      #d63534 75%
    );
    transition: transform 0.24s cubic-bezier(0.65, 1.35, 0.5, 1);
  }

  .toggle-input:checked + .toggle-handle-wrapper .toggle-handle-knob {
    transform: rotate(-90deg);
  }

  .toggle-handle-knob::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    border-radius: inherit;
    width: 100%;
    height: 100%;
    box-shadow: inset 0 0 8px 2px rgb(255 255 255 / 0.4);
    opacity: 0;
    transition: opacity 0.2s;
  }

  @media (hover: hover) {
    .toggle-input:hover:not(:disabled) + .toggle-handle-wrapper .toggle-handle-knob::after,
    .toggle-input:focus-visible + .toggle-handle-wrapper .toggle-handle-knob::after {
      opacity: 1;
    }
  }

  .toggle-handle-bar-wrapper {
    position: relative;
    width: 0.5em;
    height: 3em;
  }

  .toggle-handle-bar {
    position: absolute;
    top: calc(var(--knob-size) / 2 * -1);
    left: 0;
    width: 100%;
    height: calc(100% + var(--knob-size) / 2);
    background-image: linear-gradient(to right, #777475, #a4a4a4, #fff 45% 55%, #a4a4a4, #777475);
    background-position-x: 0.06125em;
    transition: background-position-x 0.24s cubic-bezier(0.65, 1.35, 0.5, 1);
    box-shadow: inset 0 1em 0.25em rgb(0 0 0 / 0.4);
  }

  .toggle-input:checked + .toggle-handle-wrapper .toggle-handle-bar {
    background-position-x: -0.06125em;
  }

  .toggle-base {
    position: relative;
    border-radius: 3.125em;
    padding: 0.25em;
    width: 3.5em;
    height: 1.125em;
    background-color: #fff;
    background-image: linear-gradient(to bottom, #fff, #d7d7d7);
    box-shadow: 0 -0.25em 0.5em #fff, 0 0.25em 0.5em #d7d7d7;
  }

  .toggle-base-inside {
    position: relative;
    border-radius: inherit;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(to bottom, #a6a6a6, #7d7d7d);
    box-shadow:
      inset 0 0.0625em rgb(255 255 255 / 0.2),
      inset 0 -0.03125em rgb(255 255 255 / 1),
      inset 0 -0.0625em 0.25em rgb(0 0 0 / 0.1);
  }

  .toggle-base-inside::after {
    content: "";
    position: absolute;
    border-radius: inherit;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(to bottom, #5ab054, #438c3c);
    box-shadow: inherit;
    opacity: 0;
    transition: opacity 0.24s cubic-bezier(0.65, 1.35, 0.5, 1);
  }

  .toggle-input:checked ~ .toggle-base .toggle-base-inside::after {
    opacity: 1;
  }
`;

export default PublicPrivateStatusToggle;
