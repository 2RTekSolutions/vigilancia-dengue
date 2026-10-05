import requests

URL = "https://info.dengue.mat.br/api/alertcity?geocode=3533908&disease=dengue&format=csv&ew_start=1&ew_end=53&ey_start=2024&ey_end=2026"  # Replace with the actual URL
SAVE_PATH = "data/raw/data_dengue.csv"  # Replace with the desired save path


def download_and_save_data(url, save_path):
    """
    Faz o downlodad dos dados do InfoDengue para Olímpia/SP.

    Args:
        url (str): url do arquivo a ser baixado.
        save_path (str): caminho onde o arquivo será salvo.

    Returns:
        bool: True se o download for bem-sucedido, False caso contrário.
    """
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an error for bad responses
        with open(save_path, "wb") as f:
            f.write(response.content)
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error downloading data: {e}")
        return False


download_and_save_data(url=URL, save_path=SAVE_PATH)
