// js graphql functionality
document.addEventListener("DOMContentLoaded", function () {
  const errorMsg = document.querySelector(".errorMsg");
  const endpoint = "https://learn.01founders.co/api/auth/signin";
  const graphQLEndpoint =
    "https://learn.01founders.co/api/graphql-engine/v1/graphql";
  const profileQuery = `user { attrs, campus }`;
  const skillGoQuery = `user { transactions(where: {type: {_eq: "skill_go"}}, order_by: {amount: asc}) { createdAt, amount, type, path } }`;
  const xpQuery = `user { xps { amount, path} }`;
  const auditRatioQuery = `user { audits(order_by: {createdAt: asc}, where: {grade: {_is_null: false}}) { grade, createdAt } }`;
  const londonDiv01ProjectsQuery = `
      user { 
          transactions(where: {path: {_like: "/london/div-01/%"}}, order_by: {createdAt: asc}) { 
              createdAt, amount, type, path 
          } 
      }
  `;

  document.querySelector("form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.querySelector(".user-name").value;
    const password = document.querySelector(".user-password").value;

    if (!username || !password) {
      showError("input cannot be empty");
      return;
    }

    try {
      const token = await authenticateUser(username, password);
      localStorage.setItem("token", JSON.stringify(token));
      await fetchDataAndDisplay(token);
    } catch (error) {
      showError(error.message);
    }
  });

  // Add event listener for logout button
  document
    .querySelector("#logoutButton")
    .addEventListener("click", function () {
      localStorage.removeItem("token");
      document.querySelector("#loginFormContainer").style.display = "flex";
      document.querySelector("#userProfile").style.display = "none";
      document.querySelector("#logoutButton").style.display = "none";
    });

  async function authenticateUser(username, password) {
    const base64 = btoa(`${username}:${password}`);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Basic ${base64}` },
    });

    if (!response.ok) throw new Error("Invalid credentials");

    const tokenData = await response.json();
    if (tokenData.error) throw new Error(tokenData.error);

    return tokenData;
  }

  async function fetchDataAndDisplay(token) {
    try {
      const [
        profileData,
        auditData,
        xpData,
        skillData,
        londonDiv01ProjectsData,
      ] = await Promise.all([
        fetchGraphQLData(profileQuery, token),
        fetchGraphQLData(auditRatioQuery, token),
        fetchGraphQLData(xpQuery, token),
        fetchGraphQLData(skillGoQuery, token),
        fetchGraphQLData(londonDiv01ProjectsQuery, token),
      ]);

      displayProfileData(profileData);
      displayXP(xpData.user[0].xps);
      displaySkillGraph(skillData.user[0].transactions);
      displayLondonDiv01Projects(londonDiv01ProjectsData.user[0].transactions);
      AuditRatio(londonDiv01ProjectsData.user[0].transactions);
    } catch (error) {
      console.error(error);
      showError("Failed to fetch user data.");
    }
  }

  async function fetchGraphQLData(query, token) {
    const response = await fetch(graphQLEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: `query { ${query} }` }),
    });

    const data = await response.json();
    if (data.errors)
      throw new Error(data.errors.map((err) => err.message).join(", "));

    return data.data;
  }

  function displayProfileData(data) {
    const user = data.user[0];
    document.querySelector("#loginFormContainer").style.display = "none";
    document.querySelector("#userProfile").style.display = "flex";
    document.querySelector("#logoutButton").style.display = "block"; // Show logout button

    document.querySelector(
      "#userName"
    ).textContent = `${user.attrs.firstName} ${user.attrs.lastName}`;
    document.querySelector(
      "#userEmail"
    ).innerHTML = `<span class='Span'>E-mail: </span>${user.attrs.email}`;
    document.querySelector(
      "#userPhoneNumber"
    ).innerHTML = `<span class='Span'>Telephone: </span>${user.attrs.tel}`;
    document.querySelector(
      "#userCampus"
    ).innerHTML = `<span class='Span'>Campus: </span>${user.campus}`;
  }

  function displayLondonDiv01Projects(data) {
    const projects = data.map((project) => {
      const projectPathParts = project.path.split("/");
      const projectName = projectPathParts[projectPathParts.length - 1];
      return {
        ...project,
        projectName,
      };
    });

    console.log("London Div-01 Project Data with Project Names:", projects);

    displayLineChart(
      "#graphXpAmount",
      projects.filter((d) => d.type === "xp"),
      "amount",
      "#003561",
      "XP Points over Time"
    );
  }

  function displayLineChart(containerSelector, data, key, color, title) {
    const container = d3.select(containerSelector);
    container.html("");

    const margin = { top: 40, right: 50, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Calculate cumulative XP
    let cumulativeXP = 0;
    const cumulativeData = data.map((d) => {
      cumulativeXP += d[key];
      return { ...d, cumulativeXP };
    });

    // Create scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(cumulativeData, (d) => new Date(d.createdAt)))
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(cumulativeData, (d) => d.cumulativeXP)])
      .range([height, 0]);

    // Append axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%y-%m-%d")).ticks(6));

    svg.append("g").call(d3.axisLeft(y));

    // Define the line
    const line = d3
      .line()
      .x((d) => x(new Date(d.createdAt)))
      .y((d) => y(d.cumulativeXP));

    // Add the line path
    svg
      .append("path")
      .datum(cumulativeData)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Add title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 0 - margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("text-decoration", "underline")
      .text(title);

    // Remove any existing tooltips to avoid duplicates
    d3.selectAll(".tooltip").remove();

    // Create a tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none");

    // Add data points (circles) and tooltips
    svg
      .selectAll("dot")
      .data(cumulativeData)
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("cx", (d) => x(new Date(d.createdAt)))
      .attr("cy", (d) => y(d.cumulativeXP))
      .attr("fill", color)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "#fa4493");
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `XP: ${d[key]}<br>Project: ${d.projectName}<br>Date: ${new Date(
              d.createdAt
            ).toLocaleDateString()}`
          )
          .style("left", event.pageX + 5 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 5 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", color);
        tooltip.transition().duration(500).style("opacity", 0);
      });
  }

  function displayXP(xpData) {
    // log values
    console.log("XP Data:", xpData);
    const totalXP = xpData.reduce((sum, xp) => sum + xp.amount, 0);
    console.log("Total XP:", totalXP);
    const formattedXP = (totalXP / 1000).toFixed(1);
    document.querySelector("#xpHeader").textContent = `XP: ${formattedXP} KB`;
  }

  function createBarChart(
    containerSelector,
    data,
    title,
    yAxisLabel,
    xAxisLabel,
    color = "#003561"
  ) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = "";
    // increased bottom margin for labels
    const margin = { top: 40, right: 30, bottom: 100, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.projectName))
      .range([0, width])
      .padding(0.1);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.y)])
      .nice()
      .range([height, 0]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.append("g").call(d3.axisLeft(y).ticks(5));

    // create bars
    svg
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.projectName))
      .attr("y", (d) => y(d.y))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.y))
      .attr("fill", color);

    // text labels on top of bars
    svg
      .selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d) => x(d.projectName) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.y) - 5)
      // Positioning text slightly above the top of the bar
      .attr("text-anchor", "middle")
      .text((d) => d.y)
      .style("font-size", "12px")
      .style("fill", "#003561");

    // chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 0 - margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("text-decoration", "underline")
      .text(title);

    // x axis label
    svg
      .append("text")
      .attr(
        "transform",
        `translate(${width / 2},${height + margin.bottom - 10})`
      )
      .style("text-anchor", "middle")
      .text(xAxisLabel);

    // y axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 10)
      .attr("x", 0 - height / 2)
      .style("text-anchor", "middle")
      .text(yAxisLabel);
  }

  function displaySkillGraph(transactions) {
    const data = transactions.map((d) => {
      const projectPathParts = d.path.split("/");
      const projectName = projectPathParts[projectPathParts.length - 1];
      return { x: new Date(d.createdAt), y: d.amount, projectName };
    });
    createBarChart(
      "#graphSkillAmount",
      data,
      "Golang Skills",
      "Amount",
      "Projects",
      "#2393cd"
    );
  }

  function AuditRatio(data) {
    // initialize sums for each type and an array to hold the cumulative data
    const sums = { down: 0, up: 0 };
    const cumulativeData = { down: [], up: [] };

    // total sums and prepare cumulative data
    data.forEach((project) => {
      if (project.type === "down") {
        sums.down += project.amount;
        cumulativeData.down.push({
          date: new Date(project.createdAt),
          cumulative: sums.down / 1000,
        });
      } else if (project.type === "up") {
        sums.up += project.amount;
        cumulativeData.up.push({
          date: new Date(project.createdAt),
          cumulative: sums.up / 1000,
        });
      }
    });

    // calc ratios
    const ratio = sums.down === 0 ? 0 : sums.up / sums.down;
    const formattedRatio = ratio.toFixed(1);

    // log sums and ratio to console
    console.log('Sum of amounts for type "down":', sums.down);
    console.log('Sum of amounts for type "up":', sums.up);
    console.log("Ratio:", formattedRatio);

    // display ratio in the HTML
    document.querySelector("#ratioHeading").textContent =
      "Audit Ratio: " + formattedRatio;
    // create horizontal bar chart
    const chartData = [
      { type: "Completed", amount: Math.ceil(sums.up / 1000) },
      { type: "Received", amount: Math.ceil(sums.down / 1000) },
    ];

    const margin = { top: 20, right: 80, bottom: 40, left: 70 };
    const width = 700 - margin.left - margin.right;
    const height = 100 - margin.top - margin.bottom;

    const svg = d3
      .select("#auditRatioGraph")
      // clear previous graph
      .html("")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3
      .scaleBand()
      .domain(chartData.map((d) => d.type))
      .range([0, height])
      .padding(0.5);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => d.amount)])
      .range([0, width]);

    svg.append("g").call(d3.axisLeft(y));

    svg
      .selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", (d) => y(d.type))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", (d) => x(d.amount))
      .attr("fill", (d) =>
        d.type === "Received" ? "#fa4493" : "rgb(0, 53, 97)"
      );

    svg
      .selectAll(".text")
      .data(chartData)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => x(d.amount) + 3)
      .attr("y", (d) => y(d.type) + y.bandwidth() / 2)
      .attr("dy", ".35em")
      .text((d) => d.amount + " KB")
      .attr("fill", "#ccc");

    // Create line chart for cumulative up and down values
    const lineChartMargin = { top: 40, right: 30, bottom: 50, left: 60 };
    const lineChartWidth = 800 - lineChartMargin.left - lineChartMargin.right;
    const lineChartHeight = 500 - lineChartMargin.top - lineChartMargin.bottom;

    const lineSvg = d3
      .select("#auditLineGraph")
      // clear previous graph
      .html("")
      .append("svg")
      .attr(
        "width",
        lineChartWidth + lineChartMargin.left + lineChartMargin.right
      )
      .attr(
        "height",
        lineChartHeight + lineChartMargin.top + lineChartMargin.bottom
      )
      .append("g")
      .attr(
        "transform",
        `translate(${lineChartMargin.left},${lineChartMargin.top})`
      );

    const xLine = d3
      .scaleTime()
      .domain(
        d3.extent([...cumulativeData.down, ...cumulativeData.up], (d) => d.date)
      )
      .range([0, lineChartWidth]);

    const yLine = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(
          [...cumulativeData.down, ...cumulativeData.up],
          (d) => d.cumulative
        ),
      ])
      .nice()
      .range([lineChartHeight, 0]);

    const lineUp = d3
      .line()
      .x((d) => xLine(d.date))
      .y((d) => yLine(d.cumulative));

    const lineDown = d3
      .line()
      .x((d) => xLine(d.date))
      .y((d) => yLine(d.cumulative));

    lineSvg
      .append("path")
      .datum(cumulativeData.up)
      .attr("fill", "none")
      .attr("stroke", "#003561")
      .attr("stroke-width", 1.5)
      .attr("d", lineUp);

    lineSvg
      .append("path")
      .datum(cumulativeData.down)
      .attr("fill", "none")
      .attr("stroke", "#fa4493")
      .attr("stroke-width", 1.5)
      .attr("d", lineDown);

    // abbreviated month name
    const monthFormat = d3.timeFormat("%b");
    lineSvg
      .append("g")
      .attr("transform", `translate(0,${lineChartHeight})`)
      .call(d3.axisBottom(xLine).tickFormat(monthFormat));

    lineSvg.append("g").call(d3.axisLeft(yLine));

    lineSvg
      .append("text")
      .attr("x", lineChartWidth / 2)
      .attr("y", 0 - lineChartMargin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("color", "green")
      .style("text-decoration", "underline")
      .text("Audit Ratios Over Time (KB)");

    // legend for line graph
    lineSvg
      .append("text")
      .attr("x", lineChartWidth - 50)
      .attr("y", -10)
      .attr("text-anchor", "end")
      .style("font-size", "14px")
      .style("fill", "#003561")
      .text("Completed");

    lineSvg
      .append("text")
      .attr("x", lineChartWidth - 50)
      .attr("y", 10)
      .attr("text-anchor", "end")
      .style("font-size", "14px")
      .style("fill", "#fa4493")
      .text("Received");
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = "block";
  }
});
