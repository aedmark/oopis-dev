// scripts/commands/weather.js
window.WeatherCommand = class WeatherCommand extends Command {
    constructor() {
        super({
            commandName: "weather",
            description: "Display current weather information for a location.",
            helpText: `Usage: weather [LOCATION]
      Display simulated weather information for the specified location.
      DESCRIPTION
      The weather command provides current weather conditions including
      temperature, humidity, and general conditions. If no location is
      specified, defaults to "Local Area".
      EXAMPLES
      weather
      Displays weather for the local area.
      weather "New York"
      Displays weather for New York.`,
            flagDefinitions: [
                { name: "celsius", short: "-c", description: "Display temperature in Celsius" },
                { name: "verbose", short: "-v", description: "Show detailed weather information" }
            ]
        });
    }

    async coreLogic(context) {
        const { ErrorHandler } = context.dependencies;
        const location = context.args.length > 0 ? context.args.join(" ") : "Local Area";
        
        // Simulate weather data
        const conditions = ["Sunny", "Cloudy", "Partly Cloudy", "Rainy", "Overcast"];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        
        const tempF = Math.floor(Math.random() * 60) + 40; // 40-100°F
        const tempC = Math.round((tempF - 32) * 5/9);
        const humidity = Math.floor(Math.random() * 40) + 30; // 30-70%
        const windSpeed = Math.floor(Math.random() * 15) + 5; // 5-20 mph
        
        const temp = context.flags.celsius ? `${tempC}°C` : `${tempF}°F`;
        
        let output = `Weather for ${location}:\n`;
        output += `Condition: ${condition}\n`;
        output += `Temperature: ${temp}\n`;
        
        if (context.flags.verbose) {
            output += `Humidity: ${humidity}%\n`;
            output += `Wind Speed: ${windSpeed} mph\n`;
            output += `Last Updated: ${new Date().toLocaleTimeString()}`;
        }
        
        return ErrorHandler.createSuccess(output);
    }
}
window.CommandRegistry.register(new WeatherCommand());