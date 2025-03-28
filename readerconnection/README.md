# RFID Reader GUI Application

This application provides a graphical user interface for connecting to and reading tags from an Impinj Speedway R420 RFID Reader using the sllurp library.

## Features

- Connect to RFID reader using IP address
- Real-time display of detected RFID tags
- Shows tag EPC, antenna ID, RSSI, last seen timestamp, and tag count
- Easy-to-use interface with connection status indicators

## Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install the required packages:
```bash
pip install -r requirements.txt
```

## Usage

1. Run the application:
```bash
python rfid_reader_gui.py
```

2. Enter the IP address of your RFID reader in the input field
3. Click "Connect" to establish connection with the reader
4. The application will automatically start displaying detected tags
5. Click "Disconnect" when done

## Notes

- Make sure your RFID reader is properly configured and accessible on the network
- The default IP address is set to 192.168.0.1 - change this to match your reader's IP
- The application shows the following information for each tag:
  - EPC (Electronic Product Code)
  - Antenna ID
  - RSSI (Received Signal Strength Indicator)
  - Last Seen Timestamp
  - Tag Count
