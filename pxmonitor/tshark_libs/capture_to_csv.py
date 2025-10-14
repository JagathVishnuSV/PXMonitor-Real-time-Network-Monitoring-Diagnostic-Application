

import os
import sys
import subprocess
import signal
import datetime
import time
import csv
import atexit
import math
import json
import statistics
from collections import defaultdict, deque

# Configuration based on the existing tshark-interface.js
TSHARK_CONFIG = {
    "command": os.path.join(os.path.dirname(os.path.abspath(__file__)), "tshark.exe"),
    "default_interface": "Wi-Fi",
    "fields": [
        'frame.time_epoch',
        'ip.src',
        'ip.dst',
        '_ws.col.protocol',
        'frame.len',
        'tcp.srcport',
        'tcp.dstport',
        'ip.ttl',
        'tcp.flags',
        'tcp.window_size_value',
        'tcp.analysis.ack_rtt',
        'tcp.analysis.retransmission',
        'frame.time_delta',
        'dns.time'
    ] 
}

# Port to application name mapping (from network-metrics.js)
PORT_MAP = {
    20: "FTP-DATA", 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
    67: "DHCP", 68: "DHCP", 69: "TFTP", 80: "HTTP", 110: "POP3", 123: "NTP",
    137: "NetBIOS-NS", 138: "NetBIOS-DGM", 139: "NetBIOS-SSN", 143: "IMAP",
    161: "SNMP", 162: "SNMP-TRAP", 179: "BGP", 389: "LDAP", 443: "HTTPS",
    465: "SMTPS", 514: "Syslog", 587: "SMTP-Submission", 636: "LDAPS",
    993: "IMAPS", 995: "POP3S", 1080: "SOCKS", 1194: "OpenVPN", 1433: "MSSQL",
    1521: "Oracle DB", 1723: "PPTP", 1812: "RADIUS", 2049: "NFS", 2082: "cPanel",
    2083: "cPanel-SSL", 3306: "MySQL", 3389: "RDP", 3690: "Subversion",
    4444: "Metasploit", 5000: "UPnP", 5432: "PostgreSQL", 5631: "PCAnywhere",
    5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt",
    8888: "Alternate HTTP", 9001: "Tor ORPort", 9200: "Elasticsearch",
    10000: "Webmin", 27017: "MongoDB", 50000: "SAP", 64738: "Mumble",
}

# Global variables
tshark_process = None
csv_file = None
csv_writer = None
packet_count = 0

# Buffers for processing metrics
packet_buffer = deque(maxlen=1000)  # Store the last 1000 packets for metrics calculation
last_metrics_time = 0
METRICS_INTERVAL = 5  # Calculate metrics every 5 seconds


def parse_packet(fields, header):
    """Parse raw packet fields into a packet object"""
    try:
        packet = {}
        for i, field_name in enumerate(header):
            value = fields[i] if i < len(fields) else ""
            
            # Convert numeric fields
            if field_name in ['frame.time_epoch', 'frame.time_delta', 'tcp.analysis.ack_rtt', 'dns.time']:
                packet[field_name] = float(value) if value else 0.0
            elif field_name in ['frame.len', 'tcp.srcport', 'tcp.dstport', 'ip.ttl', 'tcp.window_size_value']:
                packet[field_name] = int(value) if value else 0
            elif field_name == 'tcp.analysis.retransmission':
                packet[field_name] = value == '1'
            else:
                packet[field_name] = value
        
        return packet
    except Exception as e:
        print(f"Error parsing packet: {e}")
        # Return a minimal packet with default values
        return {
            'frame.time_epoch': time.time(),
            'ip.src': 'unknown',
            'ip.dst': 'unknown',
            '_ws.col.protocol': 'Unknown',
            'frame.len': 64,
            'tcp.srcport': 0,
            'tcp.dstport': 0,
            'ip.ttl': 64,
            'tcp.flags': '',
            'tcp.window_size_value': 0,
            'tcp.analysis.ack_rtt': 0.0,
            'tcp.analysis.retransmission': False,
            'frame.time_delta': 0.0,
            'dns.time': 0.0
        }


def calculate_average(values):
    """Calculate the average of a list of values"""
    if not values:
        return 0.0
    return sum(values) / len(values)


def calculate_std_dev(values):
    """Calculate the standard deviation of a list of values"""
    if len(values) <= 1:
        return 0.0
    try:
        return statistics.stdev(values)
    except:
        # Fallback if statistics module has issues
        avg = calculate_average(values)
        squared_diff_sum = sum((x - avg) ** 2 for x in values)
        variance = squared_diff_sum / (len(values) - 1)
        return math.sqrt(variance)


def identify_top_applications(packets, top_n=5):
    """Identify top applications based on traffic volume"""
    if not packets:
        return []
    
    # Group data by application
    applications = defaultdict(int)
    
    for packet in packets:
        src_port = packet.get('tcp.srcport', 0)
        dst_port = packet.get('tcp.dstport', 0)
        
        app_name = "Unknown"
        
        # Try to identify by port
        if src_port in PORT_MAP:
            app_name = PORT_MAP[src_port]
        elif dst_port in PORT_MAP:
            app_name = PORT_MAP[dst_port]
        elif dst_port > 1024 and dst_port < 49151:
            app_name = f"App-Port-{dst_port}"
        else:
            # If no port mapping found, use the protocol
            protocol = packet.get('_ws.col.protocol', 'Unknown')
            app_name = protocol if protocol and protocol != 'Unknown' else "Unknown"
        
        applications[app_name] += packet.get('frame.len', 0)
    
    # Convert to list and sort
    app_list = [{"application": app, "frame.len": size} 
                for app, size in applications.items()]
    
    # Sort and return top N
    return sorted(app_list, key=lambda x: x['frame.len'], reverse=True)[:top_n]


def calculate_network_metrics(packets):
    """Calculate network metrics from packet data"""
    if not packets:
        return None
    
    # Basic metrics
    rtt_values = [p.get('tcp.analysis.ack_rtt', 0) * 1000 for p in packets if p.get('tcp.analysis.ack_rtt', 0) > 0]
    latency = calculate_average(rtt_values) if rtt_values else 0
    
    delta_values = [p.get('frame.time_delta', 0) * 1000 for p in packets if p.get('frame.time_delta', 0) > 0]
    jitter = calculate_std_dev(delta_values) if delta_values else 0
    
    # Calculate bandwidth (Mbps)
    total_bytes = sum(p.get('frame.len', 0) for p in packets)
    timestamps = [p.get('frame.time_epoch', 0) for p in packets]
    if timestamps:
        time_span = max(timestamps) - min(timestamps)
        bandwidth = (total_bytes * 8) / (time_span * 1000000) if time_span > 0 else 0
    else:
        bandwidth = 0
    
    # Packet loss calculation
    retransmissions = sum(1 for p in packets if p.get('tcp.analysis.retransmission', False))
    packet_loss = (retransmissions / len(packets)) * 100 if packets else 0
    
    # DNS delay
    dns_packets = [p for p in packets if p.get('_ws.col.protocol', '') == 'DNS']
    dns_delay_values = [p.get('dns.time', 0) * 1000 for p in dns_packets if p.get('dns.time', 0) > 0]
    dns_delay = calculate_average(dns_delay_values) if dns_delay_values else 0
    
    # Window size average
    window_values = [p.get('tcp.window_size_value', 0) for p in packets if p.get('tcp.window_size_value', 0) > 0]
    avg_window = calculate_average(window_values) if window_values else 0
    
    # Determine congestion level
    if avg_window > 8000 and bandwidth > 5:
        congestion_level = "Low"
    elif avg_window > 4000 or bandwidth > 2:
        congestion_level = "Moderate"
    else:
        congestion_level = "High"
    
    # Determine stability
    if jitter < 10 and packet_loss < 1:
        stability = "Stable"
    elif jitter < 30 and packet_loss < 5:
        stability = "Unstable"
    else:
        stability = "Very Unstable"
    
    # Calculate health score
    latency_score = max(0, 100 - (latency / 2)) * 0.3
    jitter_score = max(0, 100 - (jitter * 2)) * 0.2
    packet_loss_score = max(0, 100 - (packet_loss * 10)) * 0.25
    bandwidth_score = min(100, bandwidth * 10) * 0.15
    dns_score = max(0, 100 - (dns_delay * 2)) * 0.1
    
    health_score = round(latency_score + jitter_score + packet_loss_score + bandwidth_score + dns_score)
    health_score = max(1, min(100, health_score))
    
    # Protocol counts
    protocol_counts = defaultdict(int)
    for p in packets:
        protocol = p.get('_ws.col.protocol', 'Unknown')
        protocol_counts[protocol] += 1
    
    # Top applications
    top_apps = identify_top_applications(packets)
    
    # Create metrics object
    metrics = {
        'timestamp': time.time(),
        'latency': round(latency, 2),
        'jitter': round(jitter, 2),
        'bandwidth': round(bandwidth, 2),
        'packet_loss': round(packet_loss, 2),
        'dns_delay': round(dns_delay, 2),
        'health_score': health_score,
        'stability': stability,
        'congestion_level': congestion_level,
        'packet_count': len(packets),
        'protocol_counts': dict(protocol_counts),
        'top_applications': [app['application'] for app in top_apps[:3]]  # Top 3 apps
    }
    
    return metrics


def cleanup():
    """Clean up resources when the script exits"""
    global tshark_process, csv_file
    
    print("\nCleaning up...")
    
    if tshark_process:
        try:
            tshark_process.terminate()
            time.sleep(0.5)
            if tshark_process.poll() is None:
                tshark_process.kill()
        except Exception as e:
            print(f"Error terminating TShark process: {e}")
    
    if csv_file:
        try:
            csv_file.flush()
            csv_file.close()
            print(f"CSV file closed. Total packets captured: {packet_count}")
        except Exception as e:
            print(f"Error closing CSV file: {e}")


def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\nCapture interrupted by user. Shutting down...")
    cleanup()
    sys.exit(0)


def build_tshark_command(interface):
    """Build the TShark command with arguments"""
    cmd = [TSHARK_CONFIG["command"], "-i", interface, "-T", "fields", "-E", "header=y", "-E", "separator=,"]
    
    for field in TSHARK_CONFIG["fields"]:
        cmd.extend(["-e", field])
    
    return cmd


def start_capture(interface, output_file_path):
    """Start capturing packets and writing to CSV"""
    global tshark_process, csv_file, csv_writer, packet_count, last_metrics_time
    
    # Register signal handler and cleanup function
    signal.signal(signal.SIGINT, signal_handler)
    atexit.register(cleanup)
    
    print(f"Starting packet capture on interface: {interface}")
    print(f"Writing to: {output_file_path}")
    print("Press CTRL+C to stop capture")
    
    try:
        # Open CSV file for writing
        csv_file = open(output_file_path, 'w', newline='')
        csv_writer = csv.writer(csv_file)
        
        # Write header with all fields including derived metrics
        csv_writer.writerow([
            'timestamp',
            'latency',
            'jitter',
            'bandwidth',
            'packet_loss',
            'dns_delay',
            'health_score',
            'stability',
            'congestion_level',
            'packet_count',
            'protocol_counts',
            'top_applications'
        ])
        
        # Start TShark process
        cmd = build_tshark_command(interface)
        tshark_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1  # Line buffered
        )
        
        print("TShark capture started...")
        
        # Process TShark output
        header = None
        last_metrics_time = time.time()
        
        while True:
            line = tshark_process.stdout.readline()
            if not line:
                # Check if process terminated
                if tshark_process.poll() is not None:
                    error = tshark_process.stderr.read()
                    print(f"TShark process terminated unexpectedly: {error}")
                    break
                continue
            
            line = line.strip()
            if not line:
                continue
            
            # Parse header or packet data
            if header is None:
                header = line.split(',')
                continue
            
            # Parse packet and add to buffer
            fields = line.split(',')
            packet = parse_packet(fields, header)
            packet_buffer.append(packet)
            packet_count += 1
            
            # Calculate and write metrics at regular intervals
            current_time = time.time()
            if current_time - last_metrics_time >= METRICS_INTERVAL and packet_buffer:
                metrics = calculate_network_metrics(list(packet_buffer))
                if metrics:
                    csv_writer.writerow([
                        metrics['timestamp'],
                        metrics['latency'],
                        metrics['jitter'],
                        metrics['bandwidth'],
                        metrics['packet_loss'],
                        metrics['dns_delay'],
                        metrics['health_score'],
                        metrics['stability'],
                        metrics['congestion_level'],
                        metrics['packet_count'],
                        json.dumps(metrics['protocol_counts']),
                        json.dumps(metrics['top_applications'])
                    ])
                    csv_file.flush()
                    
                    print(f"Packets: {packet_count} | Latency: {metrics['latency']}ms | "
                          f"Jitter: {metrics['jitter']}ms | Health: {metrics['health_score']} | "
                          f"Loss: {metrics['packet_loss']}%")
                    
                    last_metrics_time = current_time
            
    except Exception as e:
        print(f"Error during capture: {e}")
    finally:
        cleanup()


def main():
    """Main entry point"""
    # Get interface name from command line or use default
    interface = TSHARK_CONFIG["default_interface"]
    if len(sys.argv) > 1:
        interface = sys.argv[1]
    
    # Generate output file name with timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    default_output = f"network_metrics_{timestamp}.csv"
    
    # Get output file path from command line or use default
    output_path = default_output
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    
    # Make sure output path is absolute
    if not os.path.isabs(output_path):
        output_path = os.path.join(os.getcwd(), output_path)
    
    start_capture(interface, output_path)


if __name__ == "__main__":
    main()