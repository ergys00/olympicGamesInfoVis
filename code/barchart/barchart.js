// Margini e dimensioni del grafico
const margin = { top: 20, right: 300, bottom: 50, left: 100 };
const width = 1800 - margin.left - margin.right; // Larghezza
const height = 600 - margin.top - margin.bottom; // Altezza 

// Funzione per generare tick values interi limitati
function generateUniqueTicks(max) {
  // Se il valore massimo è piccolo, mostra tutti i valori
  if (max < 10) {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }

  // Altrimenti, genera un numero limitato di tick values
  const numberOfTicks = 8; // Numero massimo di tick desiderati
  const step = Math.ceil(max / (numberOfTicks - 1));
  const ticks = [];

  // Aggiungo sempre 0 come primo valore
  ticks.push(0);

  // Aggiungo valori intermedi basati sullo step
  for (let i = step; i < max; i += step) {
    ticks.push(i);
  }

  // Includo il valore massimo
  if (!ticks.includes(max)) {
    ticks.push(max);
  }

  return ticks;
}

// Funzione per riempire gli anni mancanti con valori predefiniti
function fillMissingYears(data, allYears) {
  const filledData = [];
  let lastValue = 0;

  allYears.forEach((year) => {
    const match = data.find((d) => d.year === year);
    if (match) {
      lastValue = match.count;
      filledData.push(match);
    } else {
      filledData.push({ year, count: 0, gold: 0, silver: 0, bronze: 0 });
    }
  });

  return filledData;
}

// Funzione per aggiornare la griglia
function updateGrid() {
  // Griglia verticale
  svg
    .select(".x-grid")
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(""))
    .selectAll("line")
    .style("stroke", "#aaa") // Colore
    .style("stroke-width", "0.5px") // Linee
    .style("stroke-dasharray", "2,2"); // Pattern tratteggiato

  // Griglia orizzontale
  svg
    .select(".y-grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
    .selectAll("line")
    .style("stroke", "#aaa") // Colore
    .style("stroke-width", "0.5px") // Linee Spessore
    .style("stroke-dasharray", "2,2"); // Densità Pattern tratteggiato
}

// Funzione per aggiornare la legenda
function updateLegend(linesData, viewMode) {
  //  Rimuovere legenda esistente
  svg.selectAll(".legend-group").remove();

  // Creazine del nuovo gruppo legeda
  const legend = svg
    .append("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(${width + 20}, 20)`);

  const items = legend
    .selectAll(".legend-item")
    .data(linesData)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`);

  //Aggiungo checkbox
  items
    .append("foreignObject")
    .attr("width", 20)
    .attr("height", 20)
    .append("xhtml:div")
    .html(
      (d) => `
      <input type="checkbox" 
        class="legend-checkbox" 
        id="checkbox-${d.key.replace(/\s+/g, "-")}" 
        checked
      />
    `
    );

  // Aggiungo colore medaglie
  items
    .append("rect")
    .attr("x", 24)
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", (d) =>
      viewMode === "medals" ? medalColors[d.key] : color(d.key)
    );

  // Aggiungo label legenda
  items
    .append("text")
    .attr("x", 44)
    .attr("y", 12)
    .text((d) => d.key)
    .attr("class", "legend-label");

  // Event listener per aggiornare la visibilità delle barre
  items.each(function (d) {
    const checkbox = d3.select(this).select("input");
    checkbox.on("change", function () {
      const isChecked = this.checked;
      const categoryKey = d.key.replace(/\s+/g, "-");

      //Aggiorno visibiltà delle barre
      svg
        .selectAll(`.bar-${categoryKey}`)
        .style("display", isChecked ? "block" : "none");

      if (!isChecked) {
        svg.selectAll(".bar").style("opacity", 1).style("stroke", "none");
        svg.select(".connecting-line-group").style("display", "none");
      }
    });
  });
}

// Creazione dell'SVG nel div del grafico
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr(
    "transform",
    `translate(${margin.left}, ${margin.top})` // Centro orizzontale
  );

svg.append("style").text(`
     .year-delimiter {
    stroke: #a0a0a0;
    stroke-width: 2px;
  }
    .legend-checkbox {
      margin-right: 8px;
      cursor: pointer;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .legend-label {
      cursor: pointer;
      user-select: none;
    }
  `);

// Scale assi
const x = d3.scaleBand().range([0, width]).padding(0.1);
const xSubgroup = d3.scaleBand().padding(0.05);
const y = d3.scaleLinear().range([height, 0]);

// Scala di colori per le discipline
const color = d3.scaleOrdinal([
  "#6FA3EF",
  "#71C687",
  "#FFD966",
  "#FFA07A",
  "#FF6FAF",
  "#BA88FF",
  "#7FC4FF",
  "#FF8674",
  "#D8A9D8",
  "#86C791",
  "#A3A3A3",
]);

// Colori per le medaglie
const medalColors = {
  Gold: "#ffc107",
  Silver: "#78909c",
  Bronze: "#cd7f32",
};

// Aggiunta degli assi
svg
  .append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0, ${height})`);

svg.append("g").attr("class", "y-axis");

// Aggiunta dei gruppi per le griglie
svg
  .append("g")
  .attr("class", "grid x-grid")
  .attr("transform", `translate(0, ${height})`);

svg.append("g").attr("class", "grid y-grid");

// Tooltip per interazione con il mouse
const tooltip = d3
  .select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("position", "absolute")
  .style("background", "rgba(0, 0, 0, 0.8)")
  .style("color", "#fff")
  .style("padding", "5px 10px")
  .style("border-radius", "5px")
  .style("display", "none");

// Variabili di stato
let activeLegendKey = null;
let olympicYears;

// Caricamento del dataset
d3.json("../../data/dataset.json").then((data) => {
  olympicYears = Array.from(
    new Set(data.links.flatMap((d) => d.attr.map((attr) => +attr.year)))
  )
    .filter((year) => ![1916, 1940, 1944].includes(year)) // Escludo gli anni non validi
    .sort((a, b) => a - b);
  // Trovo l'anno minimo e massimo
  const minYear = d3.min(
    data.links.flatMap((d) => d.attr.map((attr) => +attr.year))
  );
  const maxYear = d3.max(
    data.links.flatMap((d) => d.attr.map((attr) => +attr.year))
  );

  // Funzione per calcolare intervalli di anni
  function getYearIntervals(startYear, endYear, interval) {
    const intervals = [];
    for (let i = startYear; i < endYear; i += interval) {
      intervals.push([i, Math.min(i + interval, endYear)]);
    }
    return intervals;
  }

  const yearInterval = 20; // Intervallo di 20 anni
  let allIntervals = getYearIntervals(minYear, maxYear, yearInterval).filter(
    (interval) => !(interval[0] === 2016 && interval[1] === 2020)
  );
  allIntervals = allIntervals
    .map((interval) => {
      // Modifica l'intervallo 1896-1916 in 1896-1912
      if (interval[0] === 1896 && interval[1] === 1916) {
        return [1896, 1912];
      }
      // Unisco l'intervallo 1996-2016 e 2016-2020 in 1996-2020
      if (interval[0] === 1996 && interval[1] === 2016) {
        return [1996, 2020];
      }
      // Mantengo tutti gli altri intervalli intatti
      return interval;
    })
    .filter((interval) => {
      // Filtro gli intervalli che contengono esattamente 1916, 1940, o 1944
      const excludedYears = [1916, 1940, 1944];
      return !excludedYears.some((year) => interval.includes(year));
    });

  // Aggiungo eventuali intervalli mancanti dopo la rimozione
  const updatedIntervals = [];
  for (let i = 0; i < allIntervals.length - 1; i++) {
    const current = allIntervals[i];
    const next = allIntervals[i + 1];
    // Aggiungo intervalli intermedi mancanti
    if (current[1] !== next[0]) {
      updatedIntervals.push([current[1], next[0]]);
    }
  }
  allIntervals = [...allIntervals, ...updatedIntervals].sort(
    (a, b) => a[0] - b[0]
  );

  // Popolamento del menu a tendina per selezione intervalli
  const intervalSelect = d3.select("#interval-select");
  intervalSelect
    .selectAll("option")
    .data(allIntervals)
    .enter()
    .append("option")
    .attr("value", (d) => `${d[0]}-${d[1]}`)
    .text((d) => `${d[0]} - ${d[1]}`);

  let currentInterval = allIntervals[0];

  // Lista dei paesi con nome completo
  const countries = [
    ...new Set(
      data.nodes.filter((d) => d.noc).map((d) => ({ id: d.id, name: d.name }))
    ),
  ].sort((a, b) => a.name.localeCompare(b.name)); // Ordinamento alfabetico;
  const defaultCountry =
    countries.find((country) => country.name === "Italy")?.id ||
    countries[0].id;

  // Popolamento del menu a tendina per selezione paese
  const select = d3.select("#country-select");
  select
    .selectAll("option")
    .data(countries)
    .enter()
    .append("option")
    .attr("value", (d) => d.id)
    .text((d) => d.name)
    .property("selected", (d) => d.id === defaultCountry);

  // Aggiornamento iniziale del grafico
  updateChart(defaultCountry, "disciplines", currentInterval);

  // Event listener per cambio paese
  select.on("change", () => {
    const country = select.property("value");
    const viewMode = document.querySelector(
      'input[name="view-mode"]:checked'
    ).value;
    updateChart(country, viewMode, currentInterval);
  });

  // Event listener per cambio modalità di visualizzazione
  d3.selectAll('input[name="view-mode"]').on("change", () => {
    const viewMode = document.querySelector(
      'input[name="view-mode"]:checked'
    ).value;


    const country = select.property("value");
    // Rimuovi tutte le linee prima di aggiornare il grafico
    svg.selectAll(".year-delimiter").remove();
    svg.selectAll("line.year-delimiter").remove();
    updateChart(country, viewMode, currentInterval);
  });

  // Event listener per cambio intervallo di anni
  intervalSelect.on("change", function () {
    const selectedInterval = d3.select(this).property("value").split("-");
    currentInterval = [+selectedInterval[0], +selectedInterval[1]];
    // Rimozione delle linee esistenti
    svg.selectAll(".year-delimiter").remove();
    svg.selectAll("line.year-delimiter").remove();
    const country = select.property("value");
    const viewMode = document.querySelector(
      'input[name="view-mode"]:checked'
    ).value;
    updateChart(country, viewMode, currentInterval);
  });

  svg
    .append("g")
    .attr("class", "connecting-line-group")
    .style("display", "none");

  function updateChart(country, viewMode, currentInterval) {
    const countryData = data.links.filter((link) => link.target === country);
 
    const filteredYears = olympicYears.filter((year) => {
      if (currentInterval[0] === olympicYears[0]) {
        return year >= currentInterval[0] && year <= currentInterval[1];
      }
      return year > currentInterval[0] && year <= currentInterval[1];
    });

    // Rimuovo TUTTE le linee esistenti
    svg.selectAll(".year-delimiter").remove();
    svg.selectAll("line.year-delimiter").remove();

    // Crea o selezona il gruppo per le linee
    let yearDelimiterGroup = svg.select(".year-delimiter-group");
    if (yearDelimiterGroup.empty()) {
      yearDelimiterGroup = svg
        .append("g")
        .attr("class", "year-delimiter-group");
    } else {
      yearDelimiterGroup.selectAll("*").remove();
    }

    // Aggiorna le scale prima di disegnare le linee
    x.domain(filteredYears);

    // Disegna le linee per ogni anno nel range
    filteredYears.forEach((year) => {
      yearDelimiterGroup
        .append("line")
        .attr("class", "year-delimiter")
        .attr("x1", x(year))
        .attr("y1", 0)
        .attr("x2", x(year))
        .attr("y2", height)
        .style("stroke", "#a0a0a0")
        .style("stroke-width", "2px");
    });

    // Aggiungo la linea finale
    yearDelimiterGroup
      .append("line")
      .attr("class", "year-delimiter")
      .attr("x1", x(filteredYears[filteredYears.length - 1]) + x.bandwidth())
      .attr("y1", 0)
      .attr("x2", x(filteredYears[filteredYears.length - 1]) + x.bandwidth())
      .attr("y2", height)
      .style("stroke", "#a0a0a0")
      .style("stroke-width", "2px");

    let groupedData;
    if (viewMode === "disciplines") {
      groupedData = Array.from(
        d3.group(countryData, (d) => d.source),
        ([key, values]) => ({
          key,
          values: fillMissingYears(
            Array.from(
              d3.group(
                values.flatMap((d) => d.attr || []),
                (d) => d.year
              ),
              ([year, entries]) => ({
                year: +year,
                count: entries.length,
                gold: entries.filter((entry) => entry.medal === "Gold").length,
                silver: entries.filter((entry) => entry.medal === "Silver")
                  .length,
                bronze: entries.filter((entry) => entry.medal === "Bronze")
                  .length,
              })
            ),
            filteredYears
          ),
        })
      );
    } else {
      groupedData = Array.from(
        d3.group(
          countryData.flatMap((d) => d.attr),
          (d) => d.medal
        ),
        ([key, values]) => ({
          key,
          values: fillMissingYears(
            Array.from(
              d3.group(values, (d) => d.year),
              ([year, entries]) => ({
                year: +year,
                count: entries.length,
              })
            ),
            filteredYears
          ),
        })
      );
    }

    // Aggioramento delle scale
    x.domain(filteredYears);
    xSubgroup.domain(groupedData.map((d) => d.key)).range([0, x.bandwidth()]);
    const maxValue = Math.ceil(
      d3.max(
        groupedData.flatMap((d) => d.values),
        (d) => d.count
      )
    );

    // Se il valore massimo è 0, imposta un dominio fisso da 0 a 1
    if (maxValue === 0) {
      y.domain([0, 1]);
    } else {
      y.domain([0, maxValue]);
    }

    // Aggiorno assi
    const yTickValues = generateUniqueTicks(maxValue === 0 ? 1 : maxValue);
    svg.select(".x-axis").call(d3.axisBottom(x).tickFormat(d3.format("d")));
    svg
      .select(".y-axis")
      .call(d3.axisLeft(y).tickValues(yTickValues).tickFormat(d3.format("d")));

    svg.selectAll(".bar-group").remove();

    const yearGroups = svg
      .selectAll(".bar-group")
      .data(filteredYears)
      .enter()
      .append("g")
      .attr("class", "bar-group")
      .attr("transform", (d) => `translate(${x(d)},0)`);

    // Creazione barre per ogni categoria
    yearGroups
      .selectAll(".bar")
      .data((year) =>
        groupedData.map((group) => ({
          key: group.key,
          value: group.values.find((v) => v.year === year)?.count || 0,
          year: year,
          groupData: group.values,
        }))
      )
      .enter()
      .append("rect")
      .attr("class", (d) => `bar bar-${d.key.replace(/\s+/g, "-")}`)
      .attr("x", (d) => xSubgroup(d.key))
      .attr("y", (d) => y(d.value))
      .attr("width", xSubgroup.bandwidth())
      .attr("height", (d) => height - y(d.value))
      .attr("fill", (d) =>
        viewMode === "medals" ? medalColors[d.key] : color(d.key)
      )
      .on("mouseover", function (event, d) {
        const categoryKey = d.key.replace(/\s+/g, "-");
        const checkbox = d3.select(`#checkbox-${categoryKey}`);
        if (!checkbox.property("checked")) return;

        // Riduzione opacità barre non selezionate
        svg
          .selectAll(".bar")
          .filter(function () {
            const barCategoryKey = d3
              .select(this)
              .attr("class")
              .split(" ")[1]
              .replace("bar-", "");
            const barCheckbox = d3.select(`#checkbox-${barCategoryKey}`);
            return barCheckbox.property("checked");
          })
          .style("opacity", 0.2);

        // Evidenzio barre stessa categoria
        svg
          .selectAll(`.bar-${categoryKey}`)
          .style("opacity", 1)
          .style("stroke", "#000")
          .style("stroke-width", 2);

        // Trova i punti per la categoria selezionata
        const categoryData = filteredYears
          .map((year) => ({
            key: d.key,
            value:
              groupedData
                .find((g) => g.key === d.key)
                .values.find((v) => v.year === year)?.count || 0,
            year: year,
          }))
          .filter((point) => point.value !== undefined);

        // Mostra linea di connessione
        const lineGroup = svg.select(".connecting-line-group");
        lineGroup.style("display", "block").selectAll("*").remove();

        // Linea tratteggiata
        lineGroup
          .append("path")
          .datum(categoryData)
          .attr("fill", "none")
          .attr(
            "stroke",
            viewMode === "medals" ? medalColors[d.key] : color(d.key)
          )
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5")
          .attr(
            "d",
            d3
              .line()
              .x(
                (d) => x(d.year) + xSubgroup(d.key) + xSubgroup.bandwidth() / 2
              )
              .y((d) => y(d.value))
          );

        // Punti di connessione
        lineGroup
          .selectAll(".connection-point")
          .data(categoryData)
          .enter()
          .append("circle")
          .attr("class", "connection-point")
          .attr(
            "cx",
            (p) => x(p.year) + xSubgroup(p.key) + xSubgroup.bandwidth() / 2
          )
          .attr("cy", (p) => y(p.value))
          .attr("r", 4)
          .attr(
            "fill",
            viewMode === "medals" ? medalColors[d.key] : color(d.key)
          )
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);

        // Mostra tootlip
        const tooltipX = event.pageX + 10;
        const tooltipY = event.pageY - 28;

        tooltip
          .style("left", `${tooltipX}px`)
          .style("top", `${tooltipY}px`)
          .style("display", "block").html(`
        <strong>${d.key}</strong><br>
        Anno: ${d.year}<br>
        Medaglie: ${d.value}
      `);
      })
      .on("mouseout", function () {
        // Rispristno l'opacità
        svg
          .selectAll(".bar")
          .filter(function () {
            const barCategoryKey = d3
              .select(this)
              .attr("class")
              .split(" ")[1]
              .replace("bar-", "");
            const barCheckbox = d3.select(`#checkbox-${barCategoryKey}`);
            return barCheckbox.property("checked");
          })
          .style("opacity", 1)
          .style("stroke", "none");

        // Nascondi linea
        svg.select(".connecting-line-group").style("display", "none");

        // Nascondi tooltip
        tooltip.style("display", "none");
      });
    updateLegend(groupedData, viewMode);
    updateGrid();
  }
});

