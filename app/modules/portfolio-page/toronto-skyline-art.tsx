import styles from "./portfolio-page.module.css";

function RainStreaks({ count, seed }: { count: number; seed: number }) {
  return Array.from({ length: count }, (_, index) => {
    const x = (index * 467 + seed * 83) % 1536;
    const y = 8 + ((index * 43 + seed * 17) % 224);
    const length = 12 + ((index * 7 + seed) % 13);
    return <path d={`M${x} ${y}l-7 ${length}`} key={index} />;
  });
}

function RainField({ count, seed }: { count: number; seed: number }) {
  // Identical 256-unit rows make the downward animation seamless at its loop boundary.
  return Array.from({ length: 6 }, (_, index) => (
    <g transform={`translate(0 ${(index - 1) * 256})`} key={index}>
      <g className={styles.rainMarks}>
        <RainStreaks count={count} seed={seed} />
      </g>
    </g>
  ));
}

function SnowFlakes({ count, seed, near }: { count: number; seed: number; near?: boolean }) {
  return Array.from({ length: count }, (_, index) => {
    const x = (index * 367 + seed * 109) % 1536;
    const y = 8 + ((index * 53 + seed * 29) % 224);
    const radius = near ? 2.7 + ((index * 3 + seed) % 3) * 0.65 : 1.6 + ((index + seed) % 3) * 0.5;
    return (
      <circle cx={x} cy={y} r={radius} opacity={0.58 + ((index + seed) % 4) * 0.12} key={index} />
    );
  });
}

function SnowField({ count, seed, near = false }: { count: number; seed: number; near?: boolean }) {
  // Repeating rows align when the field completes its 256-unit fall.
  return (
    <g className={styles.snowSway}>
      {Array.from({ length: 6 }, (_, index) => (
        <g transform={`translate(0 ${(index - 1) * 256})`} key={index}>
          <SnowFlakes count={count} seed={seed} near={near} />
        </g>
      ))}
    </g>
  );
}

export function TorontoSkylineArt() {
  return (
    <>
      <svg
        className={styles.sceneBase}
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMin slice"
        role="img"
        aria-label="Layered paper illustration of the Toronto waterfront skyline and CN Tower"
      >
        <g className={styles.skyPlane}>
          <path
            className={styles.skyBandBack}
            d="M0 0h1536v188q-121 19-233-10-115-28-247 9-139 39-252 6-122-35-249 11-118 42-252 13Q92 183 0 207Z"
          />
          <path
            className={styles.skyBandMiddle}
            d="M0 178q121-26 231 9 114 38 233-4 131-48 246-5 112 42 213 4 148-46 279-2 152 48 334-4v176q-114-29-235 13-131 43-247 3-128-45-246 2-129 46-266 1-127-41-252 10Q120 416 0 386Z"
          />
          <path
            className={styles.skyBandFront}
            d="M0 352q105-39 225 2 130 49 250 5 132-47 247-10 145 51 265 6 130-48 252-2 143 51 297-5v224H0Z"
          />
          <image
            className={styles.daySkyArt}
            href="/images/toronto-paper-day-sky.webp"
            width="1536"
            height="1024"
          />
          <image
            className={styles.nightSkyArt}
            href="/images/toronto-paper-night-sky.webp"
            width="1536"
            height="1024"
          />
          <circle className={styles.sunHalo} cx="1250" cy="240" r="83" />
          <circle className={styles.moonAura} cx="965" cy="240" r="54" />
          <circle className={styles.moonHalo} cx="965" cy="240" r="28" />
          <g className={styles.nightStars}>
            <circle cx="120" cy="105" r="3" />
            <circle cx="295" cy="157" r="2" />
            <circle cx="460" cy="80" r="2.5" />
            <circle cx="610" cy="199" r="2" />
            <circle cx="915" cy="108" r="3" />
            <circle cx="1050" cy="235" r="2" />
            <circle cx="1392" cy="112" r="3" />
            <circle cx="1460" cy="300" r="2" />
            <path d="M240 248v11m-5-5h10m767-104v13m-6-7h12m315 181v10m-5-5h10" />
          </g>
          <g className={styles.weatherCloudBack}>
            <path d="M-120 218q78-40 152-12 50-49 110-12 77-47 144-8 87-36 164 2 87-29 169 14 84-34 159 4 65-32 136-4 93-31 180 12 89-27 173 13 90-25 159 12 61-30 130 5v127q-104-27-207 6-102-25-208 8-91-29-195 6-109-27-211 5-94-28-194 7-113-24-224 8-106-30-210 10-99-29-227 14Z" />
          </g>
          <g className={styles.weatherCloudFront}>
            <path d="M-150 375q76-31 157-6 62-37 132-4 87-35 163 2 83-30 164 8 72-32 148 8 88-29 171 12 80-34 158 9 87-27 171 13 83-28 170 13 71-28 154 17 80-24 153 19v110q-107-28-210 6-113-26-220 10-103-33-208 6-101-31-203 11-114-29-218 11-106-28-216 12-100-31-218 14Z" />
          </g>
        </g>
        <g className={`${styles.rainFar} ${styles.rainStreaks}`}>
          <RainField count={17} seed={1} />
        </g>
        <g className={styles.snowFar}>
          <SnowField count={10} seed={2} />
        </g>
      </svg>
      <svg
        className={styles.scenePlanes}
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMin slice"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="toronto-tower-cut">
            <path d="M780 110h2v24l2 4v30l2 4v39l2 4v28l3 4v11l-2 4v79l5 3 2 12 6 3 6 8 3 11v15l-3 10-5 7-7 3 3 180h-40l4-180-8-3-6-7-3-10v-15l3-11 6-8 7-3 2-12 8-3v-79l-3-4v-11l3-4v-28l2-4v-39l2-4v-30l2-4Z" />
          </clipPath>
          <clipPath id="toronto-tower-above-roofs">
            <path d="M730 0h110v596H730Z" />
          </clipPath>
          <clipPath id="toronto-left-buildings-cut">
            <path d="M0 448h70v143h34v16h49v-20h50V505h7v-30h107v12h12v91h58v-38h10v-61h8v60h73v31h83v24h77v17h47v35h33v38h31v166H0Z" />
          </clipPath>
          <clipPath id="toronto-right-buildings-cut">
            <path d="M870 591h2v75h29v-18h27v-6h34v-22h147v36h12v-78h69v143h28v-120h11v-11h25l8 10 8-10h24v150h29v-34h79v39h36v-12h67v63h77v-48h75v102H870Z" />
          </clipPath>
          <clipPath id="toronto-center-buildings-cut">
            <path d="M749 589h56v3h64v260H749Z" />
          </clipPath>
          <clipPath id="toronto-trees-cut">
            <path d="M0 797q24-34 51-12 24-39 55-9 25-40 62-6 29-40 62-7 31-40 63-8 34-37 67-5 27-37 63-4 33-35 67-3 33-39 67-3 30-37 64 0 31-35 66-2 31-37 64-1 33-39 68-2 31-35 66 0 34-37 67 0 32-36 65-1 31-37 66-1 31-35 66 1 31-36 64 1 32-32 64 3 32-35 65 4 34-34 68 5 33-34 67 5v198H0Z" />
          </clipPath>
          <clipPath id="toronto-shore-cut">
            <path d="M0 910q92-9 181 3 96-12 190 2 119-14 231 1 129-12 243 0 105-13 212-2 113-12 227 2 128-11 252 0v36H0Z" />
          </clipPath>
          <clipPath id="toronto-water-cut">
            <path d="M0 941q111 4 221 0 112-4 225 1 108 4 215-1 121-5 238 0 111 5 218 0 118-5 229 1 95 5 190 0v82H0Z" />
          </clipPath>
          <filter id="toronto-paper-key" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -4 0 4 0 .55" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="3" intercept="-.35" />
            </feComponentTransfer>
          </filter>
        </defs>
        <g className={styles.landPlane} data-scene-layer="land">
          <g className={styles.cityPlane} data-scene-layer="city">
            <g
              className={styles.leftBuildingPlane}
              data-building-cutout="left"
              clipPath="url(#toronto-left-buildings-cut)"
            >
              <image
                className={styles.buildingArt}
                href="/images/toronto-paper-skyline.webp"
                width="1536"
                height="1024"
              />
              <image
                className={styles.nightArt}
                href="/images/toronto-paper-skyline-night.webp"
                width="1536"
                height="1024"
              />
            </g>
            <g
              className={styles.rightBuildingPlane}
              data-building-cutout="right"
              clipPath="url(#toronto-right-buildings-cut)"
            >
              <image
                className={styles.buildingArt}
                href="/images/toronto-paper-skyline.webp"
                width="1536"
                height="1024"
              />
              <image
                className={styles.nightArt}
                href="/images/toronto-paper-skyline-night.webp"
                width="1536"
                height="1024"
              />
            </g>
            <g
              className={styles.towerPlane}
              data-building-cutout="tower"
              clipPath="url(#toronto-tower-above-roofs)"
            >
              <g clipPath="url(#toronto-tower-cut)">
                <image
                  className={styles.towerArt}
                  href="/images/toronto-paper-skyline.webp"
                  width="1536"
                  height="1024"
                />
                <image
                  className={styles.nightArt}
                  href="/images/toronto-paper-skyline-night.webp"
                  width="1536"
                  height="1024"
                />
              </g>
            </g>
            <g
              className={styles.centerBuildingPlane}
              data-building-cutout="center"
              clipPath="url(#toronto-center-buildings-cut)"
            >
              <image
                className={styles.buildingArt}
                href="/images/toronto-paper-skyline.webp"
                width="1536"
                height="1024"
              />
              <image
                className={styles.nightArt}
                href="/images/toronto-paper-skyline-night.webp"
                width="1536"
                height="1024"
              />
              <path className={styles.centerRoofEdge} d="M749 589h121v8H749Z" />
            </g>
          </g>
          <g className={`${styles.rainNear} ${styles.rainStreaks}`}>
            <RainField count={14} seed={5} />
          </g>
          <g className={styles.treesPlane} data-scene-layer="trees">
            <path d="M0 797q24-34 51-12 24-39 55-9 25-40 62-6 29-40 62-7 31-40 63-8 34-37 67-5 27-37 63-4 33-35 67-3 33-39 67-3 30-37 64 0 31-35 66-2 31-37 64-1 33-39 68-2 31-35 66 0 34-37 67 0 32-36 65-1 31-37 66-1 31-35 66 1 31-36 64 1 32-32 64 3 32-35 65 4 34-34 68 5 33-34 67 5v198H0Z" />
            <g clipPath="url(#toronto-trees-cut)">
              <image
                className={styles.dayArt}
                href="/images/toronto-paper-skyline.webp"
                width="1536"
                height="1024"
              />
              <image
                className={styles.nightArt}
                href="/images/toronto-paper-skyline-night.webp"
                width="1536"
                height="1024"
              />
            </g>
            <path
              className={styles.treeHighlights}
              d="M51 824q17-19 36 0m120 3q21-21 42 0m123-3q19-19 38 0m129-8q19-18 39 0m138 0q20-20 42 0m127 7q21-20 41 0m122-2q18-17 36 0m128-3q21-21 43 0m125 5q21-19 43 0"
            />
          </g>
          <g className={styles.shorePlane} data-scene-layer="shore">
            <path d="M0 910q92-9 181 3 96-12 190 2 119-14 231 1 129-12 243 0 105-13 212-2 113-12 227 2 128-11 252 0v36H0Z" />
            <g clipPath="url(#toronto-shore-cut)">
              <image
                className={styles.dayArt}
                href="/images/toronto-paper-skyline.webp"
                width="1536"
                height="1024"
              />
              <image
                className={styles.nightArt}
                href="/images/toronto-paper-skyline-night.webp"
                width="1536"
                height="1024"
              />
            </g>
            <path
              className={styles.shoreLine}
              d="M0 920q102-9 181 3 96-12 190 2 119-14 231 1 129-12 243 0 105-13 212-2 113-12 227 2 128-11 252 0"
            />
          </g>
        </g>
        <g className={styles.waterPlane}>
          <path d="M0 941q111 4 221 0 112-4 225 1 108 4 215-1 121-5 238 0 111 5 218 0 118-5 229 1 95 5 190 0v82H0Z" />
          <g clipPath="url(#toronto-water-cut)">
            <image
              className={styles.dayArt}
              href="/images/toronto-paper-skyline.webp"
              width="1536"
              height="1024"
            />
            <image
              className={styles.nightArt}
              href="/images/toronto-paper-skyline-night.webp"
              width="1536"
              height="1024"
            />
          </g>
          <path
            className={styles.waterMarks}
            d="M28 969h113m89 23h170m49-29h140m96 28h117m84-24h180m80 26h132m72-26h147m57 25h88"
          />
        </g>
      </svg>
      <svg
        className={styles.sceneOverlay}
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMin slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sky-wash" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="var(--scene-sky-wash)" stopOpacity="0.8" />
            <stop offset="1" stopColor="var(--scene-sky-wash)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="water-light" x1="0" x2="1">
            <stop stopColor="var(--scene-water-light)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--scene-water-light)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--scene-water-light)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className={styles.skyWash} d="M0 0h1536v485H0Z" fill="url(#sky-wash)" />
        <path className={styles.waterGlow} d="M0 953h1536v71H0Z" fill="url(#water-light)" />
        <g className={styles.waterGlints}>
          <path d="M55 972h98m103 19h70m109-23h110m271 21h75m101-24h85m199 22h97m-756 19h61m474-2h101" />
        </g>
        <g className={styles.rainRipples}>
          <path d="M145 951q19-7 38 0m-30 6q11-4 22 0M319 979q23-8 46 0m-37 7q15-5 30 0M522 957q19-7 38 0m-30 6q11-4 22 0M765 981q23-8 46 0m-37 7q15-5 30 0M1020 952q19-7 38 0m-30 6q11-4 22 0M1265 982q23-8 46 0m-37 7q15-5 30 0M1410 954q19-7 38 0m-30 6q11-4 22 0" />
        </g>
        <g className={styles.snowNear}>
          <SnowField count={8} seed={7} near />
        </g>
        <g className={styles.paperFrame}>
          <path d="M0 0h16l10 73-8 93 9 99-7 103 7 108-8 104 7 113-10 110 9 116-9 105H0Z" />
          <path d="M1536 0h-16l-10 77 8 91-9 100 8 106-8 109 9 106-7 110 9 115-10 105 10 105h16Z" />
          <path d="M0 1008q92-12 184 1 105-12 202-1 89-12 180 0 100-13 195 1 99-12 192 1 92-12 185 0 110-13 213 0 98-11 185 1v13H0Z" />
        </g>
        <path
          className={styles.paperMat}
          fillRule="evenodd"
          d="M4 4H1532V1020H4Z M20 20L160 17 310 20 460 17 615 21 770 18 925 21 1080 18 1230 21 1380 17 1516 20 1514 150 1518 300 1515 450 1519 600 1515 750 1518 900 1515 1005 1360 1002 1210 1007 1060 1003 910 1007 760 1003 610 1007 460 1003 310 1007 160 1003 20 1006 23 865 19 720 22 575 19 430 23 285 20 140Z"
        />
      </svg>
    </>
  );
}
