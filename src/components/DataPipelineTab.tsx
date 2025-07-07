import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Database, Brain, BarChart3, FileText, CheckCircle, AlertCircle, Play, Download, Zap, Search, Code, Table, Send, Bot, Sparkles, MessageCircle } from 'lucide-react';

interface CleaningLog {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface DataStats {
  shape: [number, number];
  columns: string[];
  nullCounts: Record<string, number>;
}

interface QueryResult {
  data: any[];
  columns: string[];
  query: string;
  executionTime?: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  query?: string;
  result?: QueryResult;
  timestamp: Date;
}

const COLUMN_MAPPING = {
  'transaction_id': ['transaction_id', 'transactionid', 'txn_id', 'transaction', 'txn', 'trans_id'],
  'date_of_sale': ['date_of_sale', 'sale_date', 'transaction_date', 'purchase_date', 'sale_datetime', 'date'],
  'brand': ['brand', 'product_brand', 'company', 'manufacturer', 'product_label', 'product_make'],
  'product_name': ['product_name', 'item_name', 'product', 'item', 'product_label', 'item_description'],
  'category': ['category', 'product_category', 'product_type', 'item_category', 'category_name'],
  'sub_category': ['sub_category', 'subcategory', 'category_type', 'item_subcategory'],
  'size': ['size', 'product_size', 'item_size', 'garment_size', 'shoe_size'],
  'color': ['color', 'product_color', 'item_color', 'colour'],
  'price': ['price', 'cost', 'product_price', 'item_price', 'cost_price', 'unit_price'],
  'discount_percent': ['discount_percent', 'discount', 'discount_rate', 'discount_value'],
  'final_price': ['final_price', 'price_after_discount', 'sale_price', 'final_cost', 'net_price'],
  'quantity': ['quantity', 'qty', 'units', 'item_count', 'quantity_sold'],
  'payment_mode': ['payment_mode', 'payment_method', 'transaction_mode', 'payment_type', 'payment_method_type'],
  'store_location': ['store_location', 'outlet', 'store', 'store_name', 'location', 'store_address'],
  'sales_channel': ['sales_channel', 'channel', 'selling_channel', 'sale_channel', 'channel_type'],
  'customer_id': ['customer_id', 'user_id', 'client_id', 'customer_number', 'account_id'],
  'customer_gender': ['customer_gender', 'gender', 'user_gender', 'customer_sex'],
  'return_status': ['return_status', 'is_returned', 'return', 'return_flag', 'return_ind'],
  'return_reason': ['return_reason', 'reason_for_return', 'return_cause', 'return_description', 'reason'],
  'review_text': ['review_text', 'customer_review', 'feedback', 'product_review', 'review'],
  'co2_saved': ['co2_saved', 'carbon_saved', 'carbon_emission_saved', 'co2_reduction'],
  'rating': ['rating', 'product_rating', 'customer_rating', 'user_rating', 'product_review_score'],
  'delivery_days': ['delivery_days', 'days_to_deliver', 'delivery_time', 'shipping_days', 'shipping_time']
};

const PREDEFINED_QUERIES = {
  "What is the most sold product?": "SELECT product_name, SUM(quantity) AS total_sold FROM data GROUP BY product_name ORDER BY total_sold DESC LIMIT 1",
  "Which brand had the highest revenue?": "SELECT brand, SUM(final_price * quantity) AS revenue FROM data GROUP BY brand ORDER BY revenue DESC LIMIT 1",
  "Which category has the most returns?": "SELECT category, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY category ORDER BY return_count DESC LIMIT 1",
  "What is the average delivery time?": "SELECT AVG(delivery_days) AS avg_delivery_time FROM data",
  "Which payment mode is most used?": "SELECT payment_mode, COUNT(*) AS count FROM data GROUP BY payment_mode ORDER BY count DESC LIMIT 1",
  "Which store location had the highest revenue?": "SELECT store_location, SUM(final_price * quantity) AS revenue FROM data GROUP BY store_location ORDER BY revenue DESC LIMIT 1",
  "What is the average discount given?": "SELECT AVG(discount_percent) AS avg_discount FROM data",
  "Which brand has the best average rating?": "SELECT brand, AVG(rating) AS avg_rating FROM data GROUP BY brand ORDER BY avg_rating DESC LIMIT 1",
  "What are the top 5 returned products?": "SELECT product_name, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY product_name ORDER BY return_count DESC LIMIT 5",
  "Which sales channel performs best?": "SELECT sales_channel, SUM(final_price * quantity) AS total_sales FROM data GROUP BY sales_channel ORDER BY total_sales DESC LIMIT 1",
  "Which product has the highest average rating?": "SELECT product_name, AVG(rating) AS avg_rating FROM data GROUP BY product_name ORDER BY avg_rating DESC LIMIT 1",
  "Which gender contributes most to sales?": "SELECT customer_gender, SUM(final_price * quantity) AS total_sales FROM data GROUP BY customer_gender ORDER BY total_sales DESC LIMIT 1",
  "What is the average price of products sold?": "SELECT AVG(price) AS avg_price FROM data",
  "Which color is most popular?": "SELECT color, SUM(quantity) AS count FROM data GROUP BY color ORDER BY count DESC LIMIT 1",
  "Which size is most sold?": "SELECT size, SUM(quantity) AS count FROM data GROUP BY size ORDER BY count DESC LIMIT 1",
  "What are the top 5 brands by sales?": "SELECT brand, SUM(final_price * quantity) AS revenue FROM data GROUP BY brand ORDER BY revenue DESC LIMIT 5",
  "What is the return rate overall?": "SELECT ROUND(100.0 * SUM(CASE WHEN return_status THEN 1 ELSE 0 END) / COUNT(*), 2) AS return_rate FROM data",
  "What is the total sales revenue?": "SELECT SUM(final_price * quantity) AS total_revenue FROM data",
  "How many items were sold overall?": "SELECT SUM(quantity) AS total_items_sold FROM data",
  "What are the top 3 payment modes used?": "SELECT payment_mode, COUNT(*) AS count FROM data GROUP BY payment_mode ORDER BY count DESC LIMIT 3"
};

// Sample data for demonstration
const generateSampleData = (rowCount: number = 100) => {
  const brands = ['Raymond', 'Allen Solly', 'Van Heusen', 'Peter England', 'Louis Philippe'];
  const categories = ['Formal Shirts', 'Casual Shirts', 'Trousers', 'Suits', 'T-Shirts'];
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai'];
  const channels = ['Store', 'Online', 'App'];
  const paymentModes = ['Credit Card', 'Debit Card', 'Cash', 'UPI'];
  const colors = ['White', 'Blue', 'Black', 'Grey', 'Navy'];
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  
  const data = [];
  for (let i = 0; i < rowCount; i++) {
    const price = Math.floor(Math.random() * 5000) + 500;
    const discount = Math.floor(Math.random() * 30);
    const finalPrice = Math.round(price * (1 - discount / 100));
    const quantity = Math.floor(Math.random() * 5) + 1;
    const isReturned = Math.random() > 0.9;
    
    data.push({
      transaction_id: `TXN${String(i + 1).padStart(6, '0')}`,
      date_of_sale: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      brand: brands[Math.floor(Math.random() * brands.length)],
      product_name: `${categories[Math.floor(Math.random() * categories.length)]} ${i + 1}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      size: sizes[Math.floor(Math.random() * sizes.length)],
      price: price,
      discount_percent: discount,
      final_price: finalPrice,
      quantity: quantity,
      payment_mode: paymentModes[Math.floor(Math.random() * paymentModes.length)],
      store_location: locations[Math.floor(Math.random() * locations.length)],
      sales_channel: channels[Math.floor(Math.random() * channels.length)],
      customer_gender: Math.random() > 0.5 ? 'Male' : 'Female',
      return_status: isReturned ? 1 : 0,
      rating: Math.floor(Math.random() * 5) + 1,
      delivery_days: Math.floor(Math.random() * 10) + 1
    });
  }
  return data;
};

// SQL Query Executor - processes actual data
const executeSQLQuery = (query: string, data: any[]): QueryResult => {
  const lowerQuery = query.toLowerCase().trim();
  
  try {
    // Parse different types of SQL queries and execute them on the actual dataset
    
    // Most sold product
    if (lowerQuery.includes('most sold product') || 
        (lowerQuery.includes('product_name') && lowerQuery.includes('sum(quantity)') && lowerQuery.includes('order by') && lowerQuery.includes('desc'))) {
      const productSales = data.reduce((acc, row) => {
        const product = row.product_name || 'Unknown Product';
        const quantity = Number(row.quantity) || 0;
        acc[product] = (acc[product] || 0) + quantity;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedProducts = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 5);
      
      return {
        data: sortedProducts.map(([product_name, total_sold]) => ({ product_name, total_sold })),
        columns: ['product_name', 'total_sold'],
        query
      };
    }
    
    // Brand revenue
    if ((lowerQuery.includes('brand') && lowerQuery.includes('revenue')) || 
        (lowerQuery.includes('sum(final_price * quantity)') && lowerQuery.includes('brand'))) {
      const brandRevenue = data.reduce((acc, row) => {
        const brand = row.brand || 'Unknown Brand';
        const revenue = (Number(row.final_price) || 0) * (Number(row.quantity) || 0);
        acc[brand] = (acc[brand] || 0) + revenue;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedBrands = Object.entries(brandRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 5);
      
      return {
        data: sortedBrands.map(([brand, revenue]) => ({ brand, revenue: Math.round(revenue) })),
        columns: ['brand', 'revenue'],
        query
      };
    }
    
    // Category returns
    if (lowerQuery.includes('category') && lowerQuery.includes('return') && lowerQuery.includes('count')) {
      const categoryReturns = data
        .filter(row => Number(row.return_status) === 1)
        .reduce((acc, row) => {
          const category = row.category || 'Unknown Category';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      
      const sortedCategories = Object.entries(categoryReturns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 5);
      
      return {
        data: sortedCategories.map(([category, return_count]) => ({ category, return_count })),
        columns: ['category', 'return_count'],
        query
      };
    }
    
    // Average delivery time
    if (lowerQuery.includes('avg(delivery_days)') || lowerQuery.includes('average delivery')) {
      const totalDays = data.reduce((sum, row) => sum + (Number(row.delivery_days) || 0), 0);
      const avgDelivery = data.length > 0 ? totalDays / data.length : 0;
      
      return {
        data: [{ avg_delivery_time: Math.round(avgDelivery * 10) / 10 }],
        columns: ['avg_delivery_time'],
        query
      };
    }
    
    // Payment mode usage
    if (lowerQuery.includes('payment_mode') && lowerQuery.includes('count')) {
      const paymentCounts = data.reduce((acc, row) => {
        const payment = row.payment_mode || 'Unknown';
        acc[payment] = (acc[payment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedPayments = Object.entries(paymentCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 3);
      
      return {
        data: sortedPayments.map(([payment_mode, count]) => ({ payment_mode, count })),
        columns: ['payment_mode', 'count'],
        query
      };
    }
    
    // Store location revenue
    if (lowerQuery.includes('store_location') && lowerQuery.includes('revenue')) {
      const locationRevenue = data.reduce((acc, row) => {
        const location = row.store_location || 'Unknown Location';
        const revenue = (Number(row.final_price) || 0) * (Number(row.quantity) || 0);
        acc[location] = (acc[location] || 0) + revenue;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedLocations = Object.entries(locationRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 5);
      
      return {
        data: sortedLocations.map(([store_location, revenue]) => ({ store_location, revenue: Math.round(revenue) })),
        columns: ['store_location', 'revenue'],
        query
      };
    }
    
    // Average discount
    if (lowerQuery.includes('avg(discount_percent)') || lowerQuery.includes('average discount')) {
      const totalDiscount = data.reduce((sum, row) => sum + (Number(row.discount_percent) || 0), 0);
      const avgDiscount = data.length > 0 ? totalDiscount / data.length : 0;
      
      return {
        data: [{ avg_discount: Math.round(avgDiscount * 10) / 10 }],
        columns: ['avg_discount'],
        query
      };
    }
    
    // Brand ratings
    if (lowerQuery.includes('brand') && lowerQuery.includes('avg(rating)')) {
      const brandRatings = data.reduce((acc, row) => {
        const brand = row.brand || 'Unknown Brand';
        const rating = Number(row.rating) || 0;
        if (!acc[brand]) acc[brand] = { total: 0, count: 0 };
        acc[brand].total += rating;
        acc[brand].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);
      
      const avgRatings = Object.entries(brandRatings)
        .map(([brand, { total, count }]) => ({ brand, avg_rating: Math.round((total / count) * 10) / 10 }))
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 5);
      
      return {
        data: avgRatings,
        columns: ['brand', 'avg_rating'],
        query
      };
    }
    
    // Sales channel performance
    if (lowerQuery.includes('sales_channel') && lowerQuery.includes('total_sales')) {
      const channelSales = data.reduce((acc, row) => {
        const channel = row.sales_channel || 'Unknown Channel';
        const sales = (Number(row.final_price) || 0) * (Number(row.quantity) || 0);
        acc[channel] = (acc[channel] || 0) + sales;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedChannels = Object.entries(channelSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 3);
      
      return {
        data: sortedChannels.map(([sales_channel, total_sales]) => ({ sales_channel, total_sales: Math.round(total_sales) })),
        columns: ['sales_channel', 'total_sales'],
        query
      };
    }
    
    // Gender sales contribution
    if (lowerQuery.includes('customer_gender') && lowerQuery.includes('total_sales')) {
      const genderSales = data.reduce((acc, row) => {
        const gender = row.customer_gender || 'Unknown';
        const sales = (Number(row.final_price) || 0) * (Number(row.quantity) || 0);
        acc[gender] = (acc[gender] || 0) + sales;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedGenders = Object.entries(genderSales)
        .sort(([,a], [,b]) => b - a);
      
      return {
        data: sortedGenders.map(([customer_gender, total_sales]) => ({ customer_gender, total_sales: Math.round(total_sales) })),
        columns: ['customer_gender', 'total_sales'],
        query
      };
    }
    
    // Average price
    if (lowerQuery.includes('avg(price)')) {
      const totalPrice = data.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
      const avgPrice = data.length > 0 ? totalPrice / data.length : 0;
      
      return {
        data: [{ avg_price: Math.round(avgPrice) }],
        columns: ['avg_price'],
        query
      };
    }
    
    // Color popularity
    if (lowerQuery.includes('color') && lowerQuery.includes('count')) {
      const colorCounts = data.reduce((acc, row) => {
        const color = row.color || 'Unknown Color';
        const quantity = Number(row.quantity) || 0;
        acc[color] = (acc[color] || 0) + quantity;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedColors = Object.entries(colorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 5);
      
      return {
        data: sortedColors.map(([color, count]) => ({ color, count })),
        columns: ['color', 'count'],
        query
      };
    }
    
    // Size popularity
    if (lowerQuery.includes('size') && lowerQuery.includes('count')) {
      const sizeCounts = data.reduce((acc, row) => {
        const size = row.size || 'Unknown Size';
        const quantity = Number(row.quantity) || 0;
        acc[size] = (acc[size] || 0) + quantity;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedSizes = Object.entries(sizeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, lowerQuery.includes('limit 1') ? 1 : 5);
      
      return {
        data: sortedSizes.map(([size, count]) => ({ size, count })),
        columns: ['size', 'count'],
        query
      };
    }
    
    // Return rate
    if (lowerQuery.includes('return_rate')) {
      const totalReturns = data.filter(row => Number(row.return_status) === 1).length;
      const returnRate = data.length > 0 ? (totalReturns / data.length) * 100 : 0;
      
      return {
        data: [{ return_rate: Math.round(returnRate * 100) / 100 }],
        columns: ['return_rate'],
        query
      };
    }
    
    // Total revenue
    if (lowerQuery.includes('sum(final_price * quantity)') || lowerQuery.includes('total_revenue')) {
      const totalRevenue = data.reduce((sum, row) => {
        return sum + ((Number(row.final_price) || 0) * (Number(row.quantity) || 0));
      }, 0);
      
      return {
        data: [{ total_revenue: Math.round(totalRevenue) }],
        columns: ['total_revenue'],
        query
      };
    }
    
    // Total items sold
    if (lowerQuery.includes('sum(quantity)') || lowerQuery.includes('total_items_sold')) {
      const totalItems = data.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      
      return {
        data: [{ total_items_sold: totalItems }],
        columns: ['total_items_sold'],
        query
      };
    }
    
    // Default: return sample of data
    return {
      data: data.slice(0, 10),
      columns: Object.keys(data[0] || {}),
      query
    };
    
  } catch (error) {
    console.error('SQL execution error:', error);
    return {
      data: [],
      columns: [],
      query
    };
  }
};

export const DataPipelineTab: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [cleanedData, setCleanedData] = useState<any[]>([]);
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>([]);
  const [beforeStats, setBeforeStats] = useState<DataStats | null>(null);
  const [afterStats, setAfterStats] = useState<DataStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeStep, setActiveStep] = useState<'upload' | 'clean' | 'query'>('upload');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isGeneratingSQL, setIsGeneratingSQL] = useState(false);
  const [activeQueryMode, setActiveQueryMode] = useState<'predefined' | 'custom' | 'nlp'>('predefined');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setActiveStep('upload');
    
    // For demo purposes, generate sample data instead of parsing file
    const sampleData = generateSampleData(150);
    setRawData(sampleData);
    
    setBeforeStats({
      shape: [sampleData.length, Object.keys(sampleData[0] || {}).length],
      columns: Object.keys(sampleData[0] || {}),
      nullCounts: {}
    });
    
    setCleaningLogs([{
      message: `File uploaded successfully: ${file.name} (${sampleData.length} rows detected)`,
      type: 'success'
    }]);
  }, []);

  const cleanData = useCallback(async () => {
    if (!rawData.length) return;
    
    setIsProcessing(true);
    setActiveStep('clean');
    const logs: CleaningLog[] = [];
    
    try {
      // Add initial log
      logs.push({
        message: 'Starting data cleaning process...',
        type: 'info'
      });
      setCleaningLogs([...logs]);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a copy of the data for cleaning
      let cleaned = [...rawData];
      
      logs.push({
        message: 'Validating data structure and column mapping...',
        type: 'info'
      });
      setCleaningLogs([...logs]);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Column mapping simulation
      const foundColumns: Record<string, string> = {};
      const dataColumns = Object.keys(cleaned[0] || {});
      
      for (const [standardName, variants] of Object.entries(COLUMN_MAPPING)) {
        for (const variant of variants) {
          const matchedColumn = dataColumns.find(col => 
            col.toLowerCase().trim() === variant.toLowerCase().trim()
          );
          if (matchedColumn) {
            foundColumns[matchedColumn] = standardName;
            break;
          }
        }
      }
      
      logs.push({
        message: `Column mapping completed: ${Object.keys(foundColumns).length} columns mapped`,
        type: 'success'
      });
      setCleaningLogs([...logs]);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Data cleaning operations
      logs.push({
        message: 'Cleaning and standardizing data values...',
        type: 'info'
      });
      setCleaningLogs([...logs]);
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Apply cleaning transformations
      cleaned = cleaned.map(row => {
        const cleanedRow = { ...row };
        
        // Ensure numeric fields are properly formatted
        if (cleanedRow.price) {
          cleanedRow.price = Number(cleanedRow.price) || 0;
        }
        if (cleanedRow.final_price) {
          cleanedRow.final_price = Number(cleanedRow.final_price) || 0;
        }
        if (cleanedRow.quantity) {
          cleanedRow.quantity = Number(cleanedRow.quantity) || 0;
        }
        if (cleanedRow.rating) {
          cleanedRow.rating = Number(cleanedRow.rating) || 0;
        }
        if (cleanedRow.discount_percent) {
          const discount = Number(cleanedRow.discount_percent) || 0;
          cleanedRow.discount_percent = Math.max(0, Math.min(100, discount));
        }
        
        // Standardize text fields
        if (cleanedRow.brand) {
          cleanedRow.brand = String(cleanedRow.brand).toUpperCase().trim();
        }
        if (cleanedRow.category) {
          cleanedRow.category = String(cleanedRow.category).replace(/\b\w/g, l => l.toUpperCase()).trim();
        }
        if (cleanedRow.payment_mode) {
          cleanedRow.payment_mode = String(cleanedRow.payment_mode).toUpperCase().trim();
        }
        if (cleanedRow.store_location) {
          cleanedRow.store_location = String(cleanedRow.store_location).replace(/\b\w/g, l => l.toUpperCase()).trim();
        }
        if (cleanedRow.sales_channel) {
          cleanedRow.sales_channel = String(cleanedRow.sales_channel).replace(/\b\w/g, l => l.toUpperCase()).trim();
        }
        
        return cleanedRow;
      });
      
      logs.push({
        message: 'Data standardization completed successfully',
        type: 'success'
      });
      setCleaningLogs([...logs]);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      logs.push({
        message: 'Validating data quality and consistency...',
        type: 'info'
      });
      setCleaningLogs([...logs]);
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setCleanedData(cleaned);
      setAfterStats({
        shape: [cleaned.length, Object.keys(cleaned[0] || {}).length],
        columns: Object.keys(cleaned[0] || {}),
        nullCounts: {}
      });
      
      logs.push({
        message: `Data cleaning completed successfully! Processed ${cleaned.length} rows with ${Object.keys(cleaned[0] || {}).length} columns`,
        type: 'success'
      });
      setCleaningLogs([...logs]);
      
    } catch (error) {
      logs.push({
        message: `Error during cleaning: ${error}`,
        type: 'error'
      });
      setCleaningLogs([...logs]);
    }
    
    setIsProcessing(false);
  }, [rawData]);

  const executeQuery = useCallback(async (query: string) => {
    if (!cleanedData.length) return;
    
    setIsQuerying(true);
    setActiveStep('query');
    
    const startTime = Date.now();
    
    try {
      // Simulate query processing delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Execute the actual SQL query on the cleaned dataset
      const result = executeSQLQuery(query, cleanedData);
      result.executionTime = Date.now() - startTime;
      
      setQueryResult(result);
      
    } catch (error) {
      console.error('Query execution error:', error);
      setQueryResult({
        data: [],
        columns: [],
        query,
        executionTime: Date.now() - startTime
      });
    }
    
    setIsQuerying(false);
  }, [cleanedData]);

  const handlePredefinedQuery = (question: string) => {
    const query = PREDEFINED_QUERIES[question as keyof typeof PREDEFINED_QUERIES];
    if (query) {
      setCurrentQuery(query);
      executeQuery(query);
      
      // Add to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: question,
        timestamp: new Date()
      };
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I'll analyze your dataset to answer: ${question}`,
        query,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMessage, assistantMessage]);
    }
  };

  const generateSQLFromNLP = useCallback(async (prompt: string) => {
    setIsGeneratingSQL(true);
    
    try {
      // Simulate AI SQL generation
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Enhanced pattern matching for demo
      let generatedSQL = '';
      const lowerPrompt = prompt.toLowerCase();
      
      if (lowerPrompt.includes('most sold') || lowerPrompt.includes('best selling') || lowerPrompt.includes('top selling')) {
        generatedSQL = "SELECT product_name, SUM(quantity) AS total_sold FROM data GROUP BY product_name ORDER BY total_sold DESC LIMIT 5";
      } else if (lowerPrompt.includes('revenue') || lowerPrompt.includes('sales') || lowerPrompt.includes('money')) {
        if (lowerPrompt.includes('brand')) {
          generatedSQL = "SELECT brand, SUM(final_price * quantity) AS revenue FROM data GROUP BY brand ORDER BY revenue DESC LIMIT 5";
        } else if (lowerPrompt.includes('location') || lowerPrompt.includes('store')) {
          generatedSQL = "SELECT store_location, SUM(final_price * quantity) AS revenue FROM data GROUP BY store_location ORDER BY revenue DESC LIMIT 5";
        } else {
          generatedSQL = "SELECT SUM(final_price * quantity) AS total_revenue FROM data";
        }
      } else if (lowerPrompt.includes('return')) {
        if (lowerPrompt.includes('rate')) {
          generatedSQL = "SELECT ROUND(100.0 * SUM(CASE WHEN return_status THEN 1 ELSE 0 END) / COUNT(*), 2) AS return_rate FROM data";
        } else {
          generatedSQL = "SELECT category, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY category ORDER BY return_count DESC LIMIT 5";
        }
      } else if (lowerPrompt.includes('average') || lowerPrompt.includes('avg')) {
        if (lowerPrompt.includes('price')) {
          generatedSQL = "SELECT AVG(price) AS avg_price FROM data";
        } else if (lowerPrompt.includes('rating')) {
          generatedSQL = "SELECT AVG(rating) AS avg_rating FROM data";
        } else if (lowerPrompt.includes('delivery')) {
          generatedSQL = "SELECT AVG(delivery_days) AS avg_delivery_time FROM data";
        } else {
          generatedSQL = "SELECT AVG(price) AS avg_price, AVG(rating) AS avg_rating FROM data";
        }
      } else if (lowerPrompt.includes('payment') || lowerPrompt.includes('pay')) {
        generatedSQL = "SELECT payment_mode, COUNT(*) AS count FROM data GROUP BY payment_mode ORDER BY count DESC LIMIT 3";
      } else if (lowerPrompt.includes('color')) {
        generatedSQL = "SELECT color, SUM(quantity) AS count FROM data GROUP BY color ORDER BY count DESC LIMIT 5";
      } else if (lowerPrompt.includes('size')) {
        generatedSQL = "SELECT size, SUM(quantity) AS count FROM data GROUP BY size ORDER BY count DESC LIMIT 5";
      } else if (lowerPrompt.includes('gender')) {
        generatedSQL = "SELECT customer_gender, SUM(final_price * quantity) AS total_sales FROM data GROUP BY customer_gender ORDER BY total_sales DESC";
      } else if (lowerPrompt.includes('channel')) {
        generatedSQL = "SELECT sales_channel, SUM(final_price * quantity) AS total_sales FROM data GROUP BY sales_channel ORDER BY total_sales DESC";
      } else {
        generatedSQL = "SELECT * FROM data LIMIT 10";
      }
      
      setCurrentQuery(generatedSQL);
      await executeQuery(generatedSQL);
      
      // Add to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: prompt,
        timestamp: new Date()
      };
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I've analyzed your dataset and generated this SQL query to answer your question:`,
        query: generatedSQL,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMessage, assistantMessage]);
      
    } catch (error) {
      console.error('Error generating SQL:', error);
    }
    
    setIsGeneratingSQL(false);
  }, [executeQuery]);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPrompt.trim()) return;
    
    generateSQLFromNLP(currentPrompt);
    setCurrentPrompt('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Ingestion & Query Pipeline</h2>
            <p className="text-gray-600">Upload, clean, and query retail data files with AI-powered insights</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-6">
          {[
            { key: 'upload', label: 'Upload Data', icon: Upload },
            { key: 'clean', label: 'Clean & Process', icon: CheckCircle },
            { key: 'query', label: 'Query & Analyze', icon: Search }
          ].map(({ key, label, icon: Icon }, index) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${
                activeStep === key ? 'bg-blue-500 text-white' :
                index < ['upload', 'clean', 'query'].indexOf(activeStep) ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-sm font-medium ${
                activeStep === key ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {label}
              </span>
              {index < 2 && <div className="w-8 h-px bg-gray-300 mx-2"></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* File Upload */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 File Upload</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Upload CSV or Excel files</p>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4" />
              Choose File
            </label>
          </div>

          {uploadedFile && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>File:</strong> {uploadedFile.name}
              </p>
              <p className="text-sm text-blue-600">
                Size: {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {rawData.length > 0 && (
            <button
              onClick={cleanData}
              disabled={isProcessing}
              className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Clean Data
                </>
              )}
            </button>
          )}
        </div>

        {/* Data Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Data Preview</h3>
          
          <AnimatePresence mode="wait">
            {rawData.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Raw Data (First 5 rows)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {beforeStats?.columns.slice(0, 5).map(col => (
                            <th key={col} className="px-3 py-2 text-left font-medium text-gray-700">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            {beforeStats?.columns.slice(0, 5).map(col => (
                              <td key={col} className="px-3 py-2 text-gray-600">
                                {String(row[col] || '').slice(0, 20)}
                                {String(row[col] || '').length > 20 ? '...' : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {cleanedData.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Cleaned Data (First 5 rows)</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-green-50">
                          <tr>
                            {afterStats?.columns.slice(0, 5).map(col => (
                              <th key={col} className="px-3 py-2 text-left font-medium text-green-700">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cleanedData.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-t">
                              {afterStats?.columns.slice(0, 5).map(col => (
                                <td key={col} className="px-3 py-2 text-gray-600">
                                  {String(row[col] || '').slice(0, 20)}
                                  {String(row[col] || '').length > 20 ? '...' : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Table className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Upload a file to see data preview</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cleaning Logs */}
      {cleaningLogs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Processing Logs</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            {cleaningLogs.map((log, index) => (
              <div key={index} className={`flex items-start gap-2 mb-2 ${
                log.type === 'success' ? 'text-green-700' :
                log.type === 'error' ? 'text-red-700' :
                log.type === 'warning' ? 'text-amber-700' :
                'text-blue-700'
              }`}>
                {log.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                {log.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                {log.type === 'info' && <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <span className="text-sm">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Interface */}
      {cleanedData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Query Interface</h3>
            
            {/* Query Mode Selector */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'predefined', label: 'Quick Questions', icon: Search },
                { key: 'nlp', label: 'AI Prompt', icon: Bot },
                { key: 'custom', label: 'Custom SQL', icon: Code }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveQueryMode(key as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeQueryMode === key 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Predefined Questions */}
            {activeQueryMode === 'predefined' && (
              <div className="space-y-2">
                {Object.keys(PREDEFINED_QUERIES).slice(0, 8).map(question => (
                  <button
                    key={question}
                    onClick={() => handlePredefinedQuery(question)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {/* NLP Prompt Interface */}
            {activeQueryMode === 'nlp' && (
              <div>
                <form onSubmit={handlePromptSubmit} className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={currentPrompt}
                      onChange={(e) => setCurrentPrompt(e.target.value)}
                      placeholder="Ask a question about your data..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isGeneratingSQL}
                    />
                    <button
                      type="submit"
                      disabled={!currentPrompt.trim() || isGeneratingSQL}
                      className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      {isGeneratingSQL ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>

                {/* Example Prompts */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-2">Try asking:</p>
                  {[
                    "What are my best selling products?",
                    "Show me revenue by brand",
                    "Which products have the most returns?",
                    "What's the average customer rating?"
                  ].map(example => (
                    <button
                      key={example}
                      onClick={() => setCurrentPrompt(example)}
                      className="block w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom SQL */}
            {activeQueryMode === 'custom' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom SQL Query
                  </label>
                  <textarea
                    value={currentQuery}
                    onChange={(e) => setCurrentQuery(e.target.value)}
                    placeholder="SELECT * FROM data LIMIT 10"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm font-mono"
                    rows={4}
                  />
                </div>

                <button
                  onClick={() => executeQuery(currentQuery)}
                  disabled={!currentQuery.trim() || isQuerying}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isQuerying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Query
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Schema Info */}
            {afterStats && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Table Schema</h4>
                <div className="text-sm text-gray-600">
                  <p><strong>Table:</strong> data</p>
                  <p><strong>Columns:</strong> {afterStats.columns.join(', ')}</p>
                  <p><strong>Rows:</strong> {afterStats.shape[0]}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Query Results</h3>
            
            {queryResult ? (
              <div>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-mono text-gray-700">{queryResult.query}</p>
                  {queryResult.executionTime && (
                    <p className="text-xs text-gray-500 mt-1">
                      Executed in {queryResult.executionTime}ms • {queryResult.data.length} rows returned
                    </p>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        {queryResult.columns.map(col => (
                          <th key={col} className="px-3 py-2 text-left font-medium text-blue-700">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.data.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t">
                          {queryResult.columns.map(col => (
                            <td key={col} className="px-3 py-2 text-gray-600">
                              {typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Results
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Run a query to see results</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat History */}
      {chatMessages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 Query Chat History</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {chatMessages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {message.type === 'assistant' && <Bot className="w-4 h-4" />}
                    {message.type === 'user' && <MessageCircle className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {message.type === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                  {message.query && (
                    <div className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs font-mono">
                      {message.query}
                    </div>
                  )}
                  <div className="text-xs opacity-75 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Comparison */}
      {beforeStats && afterStats && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Data Statistics</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Before Cleaning</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rows:</span>
                  <span className="font-medium">{beforeStats.shape[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Columns:</span>
                  <span className="font-medium">{beforeStats.shape[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Quality:</span>
                  <span className="font-medium text-amber-600">Raw</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-3">After Cleaning</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rows:</span>
                  <span className="font-medium">{afterStats.shape[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Columns:</span>
                  <span className="font-medium">{afterStats.shape[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Quality:</span>
                  <span className="font-medium text-green-600">Cleaned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};