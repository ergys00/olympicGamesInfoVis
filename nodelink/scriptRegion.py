import json

# Define the regions based on the country IDs
REGION_MAPPING = {
    "Africa": [
        "ALG", "BOT", "BUR", "BDI", "CIV", "CMR", "COD", "COM", "CPV", "DJI", "EGY", "ERI",
        "ETH", "GAB", "GHA", "GIN", "GMB", "GUI", "KEN", "LES", "LBR", "LBY", "MAD", 
        "MLI", "MLW", "MOZ", "MRI", "NAM", "NIG", "NGR", "RWA", "SEN", "SEY", "SLE", 
        "SOM", "STP", "SUD", "SWZ", "TAN", "TOG", "TUN", "UGA", "ZAM", "ZIM", "LBN", "KSA", "UAR", "MAR", "KUW", "RSA"
    ],
    "Asia & Oceania": [
        "AFG", "AUS", "BRN", "BAN", "BHU", "CAM", "CHN", "FIJ", "GUM", "HKG", "INA", 
        "IND", "IRI", "IRQ", "ISR", "JPN", "JOR", "KAZ", "KOR", "KGZ", "LAO", "LIB", 
        "MAS", "MDV", "MGL", "MYA", "NEP", "NZL", "OMA", "PAK", "PHI", "PLE", "QAT", "ROC",
        "SAM", "SIN", "SRI", "SYR", "THA", "TKM", "TJK", "TLS", "TGA", "UAE", "UZB", "URS",
        "VIE", "YEM", "ANZ", "SGP", "PRK", "TPE"
    ],
    "Europe": [
        "ALB", "AND", "ARM", "AUT", "AZE", "BEL", "BIH", "BLR", "BOH", "BUL", "CRO", "CYP", 
        "CZE", "DEN", "ESP", "EST", "FIN", "FRA", "GEO", "GER", "GDR", "GRE", "HUN", "ISL", 
        "IRL", "ITA", "KOS", "LAT", "LIE", "LTU", "LUX", "MDA", "MKD", "MLT", "MNE", 
        "MON", "NED", "NOR", "POL", "POR", "ROU", "RUS", "SMR", "SRB", "SVK", "SVN", 
        "SWE", "SUI", "TUR", "UKR", "GBR", "YUG", "FRG", "SCG", "TCH", "SLO"
    ],
    "Americas": [
        "ANT", "ARG", "ARU", "BAH", "BAR", "BER", "BIZ", "BOL", "BRA", "CAN", "CHI", 
        "COL", "CRC", "CUB", "DMA", "DOM", "ECU", "ESA", "GRN", "GUA", "GUY", "HAI", 
        "HON", "ISV", "JAM", "MEX", "NCA", "PAN", "PAR", "PER", "PUR", "SKN", "LCA", 
        "SUR", "TTO", "USA", "URU", "VEN", "WIF", "AHO"
    ],
    "Sport": [
        "shooting", "fighting", "cycling", "swimming", "gymnastics", "athletics", "equestrian", "boating", "other", "racquets", "teams"
    ]
}


def get_region(id):
    """Determine the region for a given ID."""
    for region, ids in REGION_MAPPING.items():
        if id in ids:
            return region
    return "Unknown"

def process_dataset(input_file, output_file):
    """Read the input dataset, enrich it with a region field, and write to output."""
    try:
        # Load the dataset
        with open(input_file, 'r', encoding='utf-8') as file:
            dataset = json.load(file)

        # Check if dataset is a dictionary or list
        if isinstance(dataset, dict):
            print("Dataset is a dictionary. Trying to extract the list...")
            dataset = dataset.get("nodes", [])
        
        if not isinstance(dataset, list):
            raise ValueError("Dataset is not a list of dictionaries.")

        # Add the region field to each country
        for entry in dataset:
            if isinstance(entry, dict):  # Ensure each item is a dictionary
                entry["region"] = get_region(entry.get("id", ""))
            else:
                raise ValueError("Dataset contains non-dictionary elements.")

        # Save the enriched dataset to a new file
        with open(output_file, 'w', encoding='utf-8') as file:
            json.dump(dataset, file, indent=4, ensure_ascii=False)

        print(f"Dataset enriched and saved to {output_file}")

    except json.JSONDecodeError:
        print("Error: Input file is not valid JSON.")
    except Exception as e:
        print(f"An error occurred: {e}")

# Input and output file paths
input_file = "dataset.json"
output_file = "dataset2.json"

# Process the dataset
process_dataset(input_file, output_file)
