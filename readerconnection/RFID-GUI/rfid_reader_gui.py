import tkinter as tk
from tkinter import ttk, messagebox
from sllurp.llrp import LLRPReaderClient, LLRPReaderConfig, LLRP_DEFAULT_PORT
from unittest.mock import MagicMock
import logging
import threading
import queue
import time

class RFIDReaderGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("RFID Reader Interface")
        self.root.geometry("600x400")
        
        self.reader = None
        self.tag_queue = queue.Queue()
        self.epc_to_item = {}

        logging.getLogger('sllurp').setLevel(logging.INFO)

        self.create_gui()
        self.update_tag_display()

    def create_gui(self):
        connection_frame = ttk.LabelFrame(self.root, text="Reader Connection", padding="10")
        connection_frame.pack(fill="x", padx=10, pady=5)

        ttk.Label(connection_frame, text="IP Address:").grid(row=0, column=0, padx=5)
        self.ip_entry = ttk.Entry(connection_frame)
        self.ip_entry.grid(row=0, column=1, padx=5)
        self.ip_entry.insert(0, "169.254.1.1")

        self.connect_button = ttk.Button(connection_frame, text="Connect", command=self.connect_to_reader)
        self.connect_button.grid(row=0, column=2, padx=5)

        self.disconnect_button = ttk.Button(connection_frame, text="Disconnect", command=self.disconnect_reader, state="disabled")
        self.disconnect_button.grid(row=0, column=3, padx=5)

        self.simulate_var = tk.BooleanVar()
        self.simulate_check = ttk.Checkbutton(connection_frame, text="Simular lector", variable=self.simulate_var)
        self.simulate_check.grid(row=0, column=4, padx=5)

        status_frame = ttk.LabelFrame(self.root, text="Status", padding="10")
        status_frame.pack(fill="x", padx=10, pady=5)
        self.status_label = ttk.Label(status_frame, text="Not Connected")
        self.status_label.pack()

        tags_frame = ttk.LabelFrame(self.root, text="Detected Tags", padding="10")
        tags_frame.pack(fill="both", expand=True, padx=10, pady=5)

        columns = ("EPC", "Antenna", "RSSI", "Last Seen", "Count")
        self.tree = ttk.Treeview(tags_frame, columns=columns, show="headings")

        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=100)

        scrollbar = ttk.Scrollbar(tags_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def tag_report_callback(self, reader, tags):
        if tags:
            for tag in tags:
                self.tag_queue.put(tag)
                print(f"Tag received: {tag}")

    def update_tag_display(self):
        try:
            while True:
                tag = self.tag_queue.get_nowait()
                epc = tag.get("EPC-96", "N/A")
                antenna = tag.get("AntennaID", "N/A")
                rssi = tag.get("PeakRSSI", "N/A")
                last_seen = tag.get("LastSeenTimestampUTC", "N/A")
                count = tag.get("TagSeenCount", "N/A")

                if epc in self.epc_to_item:
                    item_id = self.epc_to_item[epc]
                    self.tree.item(item_id, values=(epc, antenna, rssi, last_seen, count))
                else:
                    item_id = self.tree.insert("", "end", values=(epc, antenna, rssi, last_seen, count))
                    self.epc_to_item[epc] = item_id
        except queue.Empty:
            pass

        self.root.after(100, self.update_tag_display)

    def connect_to_reader(self):
        if self.simulate_var.get():
            self.status_label.config(text="Simulando lector...")
            self.connect_button.config(state="disabled")
            self.ip_entry.config(state="disabled")
            self.disconnect_button.config(state="normal")

            self.reader = MagicMock()
            self.reader._tag_report_callbacks = []

            def add_tag_report_callback(cb):
                self.reader._tag_report_callbacks.append(cb)
                def simulate():
                    epcs = ["DEADBEEF12345678", "CAFEBABE87654321", "A1B2C3D4E5F60708", "0123456789ABCDEF"]
                    count = 0
                    while self.reader:
                        simulated_tags = []
                        for i, epc in enumerate(epcs):
                            tag = {
                                "EPC-96": epc,
                                "AntennaID": (i % 2) + 1,
                                "PeakRSSI": -40 - i * 5,
                                "LastSeenTimestampUTC": int(time.time()),
                                "TagSeenCount": count + 1
                            }
                            simulated_tags.append(tag)
                        cb(self.reader, simulated_tags)
                        count += 1
                        time.sleep(2)
                threading.Thread(target=simulate, daemon=True).start()
            self.reader.add_tag_report_callback = add_tag_report_callback
            self.reader.disconnect = lambda: None

            self.reader.add_tag_report_callback(self.tag_report_callback)
            self.connection_successful()
            return

        host = self.ip_entry.get().strip()
        if not host:
            messagebox.showerror("Error", "Please enter an IP address")
            return

        def connect():
            try:
                config = LLRPReaderConfig({
                    'tag_content_selector': {
                        'EnableROSpecID': True,
                        'EnableSpecIndex': True,
                        'EnableInventoryParameterSpecID': True,
                        'EnableAntennaID': True,
                        'EnableChannelIndex': True,
                        'EnablePeakRSSI': True,
                        'EnableFirstSeenTimestamp': True,
                        'EnableLastSeenTimestamp': True,
                        'EnableTagSeenCount': True,
                        'EnableAccessSpecID': True
                    },
                    'start_inventory': True,
                    'report_every_n_tags': 1,
                    'antennas': [1],
                    'tx_power': 0,
                    'mode_identifier': 1000,
                    'session': 2,
                    'tag_population': 4
                })

                self.reader = LLRPReaderClient(host, LLRP_DEFAULT_PORT, config)
                self.reader.add_tag_report_callback(self.tag_report_callback)
                self.reader.connect()
                
            except Exception as e:
                self.root.after(0, lambda: self.connection_failed(str(e)))
                return
            self.root.after(0, self.connection_successful)

        self.status_label.config(text="Connecting...")
        self.connect_button.config(state="disabled")
        self.ip_entry.config(state="disabled")
        threading.Thread(target=connect, daemon=True).start()

    def connection_successful(self):
        self.status_label.config(text="Connected")
        self.disconnect_button.config(state="normal")
        messagebox.showinfo("Success", "Connected to RFID Reader")

    def connection_failed(self, error_message):
        self.status_label.config(text="Connection Failed")
        self.connect_button.config(state="normal")
        self.ip_entry.config(state="normal")
        messagebox.showerror("Error", f"Failed to connect: {error_message}")

    def disconnect_reader(self):
        if self.reader:
            try:
                self.reader.disconnect()
            except Exception as e:
                messagebox.showerror("Error", f"Failed to disconnect: {str(e)}")
            self.reader = None
            self.status_label.config(text="Disconnected")
            self.connect_button.config(state="normal")
            self.ip_entry.config(state="normal")
            self.disconnect_button.config(state="disabled")
            self.tree.delete(*self.tree.get_children())
            self.epc_to_item.clear()


if __name__ == "__main__":
    root = tk.Tk()
    app = RFIDReaderGUI(root)
    root.mainloop()
