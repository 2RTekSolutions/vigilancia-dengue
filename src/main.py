from src.data.import_data import download_data


def main():
    url = "https://info.dengue.mat.br/api/alertcity?geocode=3533908&disease=dengue&format=csv&ew_start=1&ew_end=53&ey_start=2024&ey_end=2026"  # Replace with the actual URL
    save_path = "./data/raw/data_dengue.csv"  # Replace with the desired save path

    if download_data(url, save_path):
        print("Data downloaded successfully.")
    else:
        print("Failed to download data.")

if __name__ == "__main__":
    main()