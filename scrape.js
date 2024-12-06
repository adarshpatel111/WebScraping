import puppeteer from "puppeteer";
import fs from "fs/promises";

const scrape = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const carData = [];
  let pageNumber = 1;
  let hasNextPage = true; // Flag to check if there is a next page

  try {
    while (hasNextPage) {
      const url = `https://www.cars.com/research/search/?page=${pageNumber}&style[]=luxury`; // Update URL accordingly
      await page.goto(url, {
        waitUntil: "load",
        timeout: 60000,
      });

      // Wait for the necessary selector that indicates the page has loaded
      await page.waitForSelector("spark-card.research-mmy-card", {
        timeout: 60000,
      });

      const carLinks = await page.evaluate(() => {
        const links = [];
        const carCards = document.querySelectorAll(
          "spark-card.research-mmy-card"
        );
        carCards.forEach((card) => {
          const link = card.querySelector("a");
          if (link) {
            links.push(link.href);
          }
        });
        return links;
      });

      for (let i = 0; i < carLinks.length; i++) {
        await page.goto(carLinks[i], {
          waitUntil: "load",
          timeout: 60000,
        });

        await page.waitForSelector("div.hero-section", { timeout: 60000 });

        const carDetails = await page.evaluate(() => {
          const data = {
            make:
              document.querySelector(
                "div.new-cars-model-title>div.new-cars-model-title-top-content>div.make-link>a>div.make-link-make-name"
              )?.innerText || "",
            model:
              document.querySelector(
                "div.new-cars-model-title>div.new-cars-model-title-top-content>h1"
              )?.innerText || "",
            year:
              document.querySelector(
                "div.hero-section>div.new-cars-model-title>div.new-cars-model-title-top-content>div.new-cars-model-title-lead-in>div.year-switch-single>button.single-year"
              )?.innerText || "",
            price:
              document.querySelector(
                "div.new-cars-model-title>div.new-cars-model-title-top-content>div.model-year-starting-msrp.msrp-wrapper>div.msrp.spark-heading-3"
              )?.innerText || "",
            mileage:
              document.querySelector(".mileage-selector")?.innerText || "",
            color:
              Array.from(
                document.querySelectorAll(
                  "div.configurator>div.configurator-exterior-colors>div.exterior-colors-wrapper>div.exterior-colors>button.exterior-color-btn"
                )
              ).map(
                (btn) =>
                  btn
                    .getAttribute("style")
                    ?.match(
                      /background-color:\s*(#[a-fA-F0-9]{6}|[a-zA-Z]+);/
                    )?.[1]
              ) || [],
            transmission:
              document.querySelector(".transmission-selector")?.innerText || "",
            fuelType:
              document.querySelector(".fuel-type-selector")?.innerText || "",
            engineSize:
              document.querySelector(".engine-size-selector")?.innerText || "",
            description:
              document.querySelector(".description-selector")?.innerText || "",
            images:
              Array.from(
                document.querySelectorAll(
                  "spark-gallery-grid.new-cars-gallery-grid>img"
                )
              ).map((img) => img.src) || [],
            location: {
              city: document.querySelector(".city-selector")?.innerText || "",
              state: document.querySelector(".state-selector")?.innerText || "",
              country:
                document.querySelector(".country-selector")?.innerText || "",
              postalCode:
                document.querySelector(".postal-code-selector")?.innerText ||
                "",
            },
            features:
              Array.from(document.querySelectorAll(".feature-selector")).map(
                (feature) => feature.innerText
              ) || [],
            engineDetails: {
              engineType:
                document.querySelector(".engine-type-selector")?.innerText ||
                "",
              engineCapacity:
                document.querySelector(".engine-capacity-selector")
                  ?.innerText || "",
              powerOutput:
                document.querySelector(".power-output-selector")?.innerText ||
                "",
              torque:
                document.querySelector(".torque-selector")?.innerText || "",
              transmissionType:
                document.querySelector(".transmission-type-selector")
                  ?.innerText || "",
              fuelEfficiency:
                document.querySelector(".fuel-efficiency-selector")
                  ?.innerText || "",
              emissions:
                document.querySelector(".emissions-selector")?.innerText || "",
            },
            performanceDetails: {
              topSpeed:
                document.querySelector(".top-speed-selector")?.innerText || "",
              acceleration:
                document.querySelector(".acceleration-selector")?.innerText ||
                "",
              driveType:
                document.querySelector(".drive-type-selector")?.innerText || "",
              suspensionType:
                document.querySelector(".suspension-type-selector")
                  ?.innerText || "",
            },
            exteriorDetails: {
              bodyType:
                document.querySelector(".body-type-selector")?.innerText || "",
              dimensions: {
                length:
                  document.querySelector(".length-selector")?.innerText || "",
                width:
                  document.querySelector(".width-selector")?.innerText || "",
                height:
                  document.querySelector(".height-selector")?.innerText || "",
                wheelbase:
                  document.querySelector(".wheelbase-selector")?.innerText ||
                  "",
                groundClearance:
                  document.querySelector(".ground-clearance-selector")
                    ?.innerText || "",
              },
              weight:
                document.querySelector(".weight-selector")?.innerText || "",
              colorOptions:
                Array.from(
                  document.querySelectorAll(".color-option-selector")
                ).map((option) => option.innerText) || [],
              wheelSize:
                document.querySelector(".wheel-size-selector")?.innerText || "",
              tireSize:
                document.querySelector(".tire-size-selector")?.innerText || "",
            },
            pricing: {
              msrp: document.querySelector(".msrp-selector")?.innerText || "",
              availability:
                document.querySelector(".availability-selector")?.innerText ||
                "",
              variants:
                Array.from(document.querySelectorAll(".variant-selector")).map(
                  (variant) => variant.innerText
                ) || [],
            },
            customizationOptions: {
              packages:
                Array.from(document.querySelectorAll(".package-selector")).map(
                  (pkg) => pkg.innerText
                ) || [],
              accessories:
                Array.from(
                  document.querySelectorAll(".accessory-selector")
                ).map((accessory) => accessory.innerText) || [],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return data;
        });

        carData.push(carDetails);
        console.log(
          `Scraped car ${i + 1} from page ${pageNumber}:`,
          carDetails
        );
      }

      // Check if the "Next" button is available to move to the next page
      hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector(".pagination-next");
        return nextButton && !nextButton.classList.contains("disabled");
      });

      if (hasNextPage) {
        pageNumber++; // Increment page number to load the next page
      }
    }

    const jsonData = JSON.stringify(carData, null, 2);
    await fs.writeFile("scrapedData.json", jsonData);
    console.log("JSON file has been created successfully.");
  } catch (err) {
    console.error("Error during scraping:", err);
  } finally {
    await browser.close();
  }
};

export default scrape;
