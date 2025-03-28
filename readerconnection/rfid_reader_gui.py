import tkinter as tk
from tkinter import ttk, messagebox
from sllurp import llrp
from sllurp.llrp import LLRPReaderConfig, LLRPReaderClient, LLRP_DEFAULT_PORT, LLRPReaderState
import logging
import threading
import queue

class RFIDReaderGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("RFID Reader Interface")
        self.root.geometry("600x400")
        
        self.reader = None
        self.tag_queue = queue.Queue()
        self.epc_to_item = {}  # Dictionary to track EPCs and their tree items
        
        # Configure logging
        logging.getLogger('sllurp').setLevel(logging.INFO)
        
        self.create_gui()
        self.update_tag_display()
        
    def create_gui(self):
        # Connection Frame
        connection_frame = ttk.LabelFrame(self.root, text="Reader Connection", padding="10")
        connection_frame.pack(fill="x", padx=10, pady=5)
        
        ttk.Label(connection_frame, text="IP Address:").grid(row=0, column=0, padx=5)
        self.ip_entry = ttk.Entry(connection_frame)
        self.ip_entry.grid(row=0, column=1, padx=5)
        self.ip_entry.insert(0, "169.254.1.1")  # Default IP
        
        self.connect_button = ttk.Button(connection_frame, text="Connect", command=self.connect_to_reader)
        self.connect_button.grid(row=0, column=2, padx=5)
        
        self.disconnect_button = ttk.Button(connection_frame, text="Disconnect", command=self.disconnect_reader, state="disabled")
        self.disconnect_button.grid(row=0, column=3, padx=5)
        
        # Status Frame
        status_frame = ttk.LabelFrame(self.root, text="Status", padding="10")
        status_frame.pack(fill="x", padx=10, pady=5)
        
        self.status_label = ttk.Label(status_frame, text="Not Connected")
        self.status_label.pack()
        
        # Tags Frame
        tags_frame = ttk.LabelFrame(self.root, text="Detected Tags", padding="10")
        tags_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Create Treeview
        columns = ("EPC", "Antenna", "RSSI", "Last Seen", "Count")
        self.tree = ttk.Treeview(tags_frame, columns=columns, show="headings")
        
        # Set column headings
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=100)
        
        # Add scrollbar
        scrollbar = ttk.Scrollbar(tags_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack Treeview and scrollbar
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
    def tag_report_callback(self, reader, tags):
        """Called when tags are reported by the reader"""
        if tags:
            for tag in tags:
                # Put tag in queue for GUI update
                self.tag_queue.put(tag)
                print(f"Tag received: {tag}")  # Debug print
    
    def update_tag_display(self):
        """Update the GUI with any new tags from the queue"""
        try:
            while True:  # Process all available tags
                tag = self.tag_queue.get_nowait()
                epc = tag.get("EPC-96", "N/A")
                antenna = tag.get("AntennaID", "N/A")
                rssi = tag.get("PeakRSSI", "N/A")
                last_seen = tag.get("LastSeenTimestampUTC", "N/A")
                count = tag.get("TagSeenCount", "N/A")
                
                if epc in self.epc_to_item:
                    # Update existing entry
                    item_id = self.epc_to_item[epc]
                    self.tree.item(item_id, values=(epc, antenna, rssi, last_seen, count))
                else:
                    # Add new entry
                    item_id = self.tree.insert("", "end", values=(epc, antenna, rssi, last_seen, count))
                    self.epc_to_item[epc] = item_id
                    print(f"Added new tag: {epc}")  # Debug print
                    
        except queue.Empty:
            pass
        
        # Schedule next update
        self.root.after(100, self.update_tag_display)
    
    def connect_to_reader(self):
        host = self.ip_entry.get().strip()
        if not host:
            messagebox.showerror("Error", "Please enter an IP address")
            return
            
        try:
            # Configure reader
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
                'report_every_n_tags': 1,  # Report each tag
                'antennas': [1],  # Use antenna 1
                'tx_power': 0,  # Maximum power
                'mode_identifier': 1000,  # Auto set
                'session': 2,  # Session 2
                'tag_population': 4
            })
            
            self.reader = LLRPReaderClient(host, LLRP_DEFAULT_PORT, config)
            self.reader.add_tag_report_callback(self.tag_report_callback)
            
            # Connect in a separate thread
            def connect_thread():
                try:
                    self.reader.connect()
                    self.root.after(0, self.connection_successful)
                except Exception as e:
                    self.root.after(0, lambda: self.connection_failed(str(e)))
            
            threading.Thread(target=connect_thread, daemon=True).start()
            
            self.status_label.config(text="Connecting...")
            self.connect_button.config(state="disabled")
            self.ip_entry.config(state="disabled")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to initialize reader: {str(e)}")
    
    def inventory_started_callback(self, reader, state):
        """Called when the reader starts inventorying"""
        self.root.after(0, lambda: self.status_label.config(text="Connected - Reading Tags"))
    
    def connection_successful(self):
        self.status_label.config(text="Connected")
        self.disconnect_button.config(state="normal")
        messagebox.showinfo("Success", "Connected to RFID Reader")
    
    def connection_failed(self, error_message):
        self.status_label.config(text="Not Connected")
        self.connect_button.config(state="normal")
        self.ip_entry.config(state="normal")
        messagebox.showerror("Error", f"Failed to connect: {error_message}")
    
    def disconnect_reader(self):
        if self.reader:
            try:
                self.reader.disconnect()
                self.reader = None
                self.status_label.config(text="Not Connected")
                self.connect_button.config(state="normal")
                self.disconnect_button.config(state="disabled")
                self.ip_entry.config(state="normal")
                self.tree.delete(*self.tree.get_children())  # Clear the tag list
                self.epc_to_item.clear()  # Clear the EPC tracking dictionary
                messagebox.showinfo("Success", "Disconnected from RFID Reader")
            except Exception as e:
                messagebox.showerror("Error", f"Error disconnecting: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = RFIDReaderGUI(root)
    root.mainloop()
