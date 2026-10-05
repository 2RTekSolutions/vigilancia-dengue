import os

import requests

def download_data(url, save_path):
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
        with open(save_path, 'wb') as f:
            f.write(response.content)
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error downloading data: {e}")
        return False